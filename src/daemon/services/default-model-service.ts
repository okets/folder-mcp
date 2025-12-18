/**
 * Default Model Service
 *
 * Manages the system-wide default embedding model.
 * Acts as the bridge between:
 * - ConfigurationComponent (persistence)
 * - DefaultModelSelector (hardware detection)
 * - FMDMService (real-time state broadcasting)
 *
 * Phase 11, Sprint 3: Default Model System
 */

import { ILoggingService } from '../../di/interfaces.js';
import { ConfigurationComponent } from '../../config/ConfigurationComponent.js';
import { DefaultModelConfig } from '../models/fmdm.js';
import { IFMDMService } from './fmdm-service.js';
import { DefaultModelSelector, DefaultModelSelection } from './default-model-selector.js';
import { CuratedModelInfo } from '../models/fmdm.js';
import { getModelById, findSmallestCpuModel } from '../../config/model-registry.js';

/**
 * Default Model Service interface
 */
export interface IDefaultModelService {
  /**
   * Get current default model configuration
   */
  getDefaultModel(): Promise<DefaultModelConfig>;

  /**
   * Set user's default model choice
   * Returns the updated configuration
   */
  setDefaultModel(modelId: string, languages?: string[]): Promise<DefaultModelConfig>;

  /**
   * Initialize the service and sync with FMDM
   * Should be called during daemon startup
   */
  initialize(curatedModels: CuratedModelInfo[], pythonAvailable: boolean): Promise<void>;

  /**
   * Get recommended model based on hardware (without changing user preference)
   */
  getRecommendedModel(curatedModels: CuratedModelInfo[], pythonAvailable: boolean): Promise<string>;
}

/**
 * Default Model Service implementation
 */
export class DefaultModelService implements IDefaultModelService {
  constructor(
    private configComponent: ConfigurationComponent,
    private fmdmService: IFMDMService,
    private logger: ILoggingService
  ) {
    this.logger.debug('[DefaultModelService] Initialized');
  }

  /**
   * Get current default model configuration
   */
  async getDefaultModel(): Promise<DefaultModelConfig> {
    try {
      // Check if user has explicitly set a model
      const storedSelection = await this.configComponent.getDefaultModelSelection();

      if (storedSelection && storedSelection.modelId) {
        // User has explicitly set a model - include languages if present
        return {
          modelId: storedSelection.modelId,
          source: 'user',
          ...(storedSelection.languages && { languages: storedSelection.languages })
        };
      }

      // No user preference - use what's in FMDM (which should be recommended)
      return this.fmdmService.getDefaultModel();

    } catch (error) {
      this.logger.error('[DefaultModelService] Failed to get default model:', error instanceof Error ? error : new Error(String(error)));
      // Return FMDM's current value as fallback
      return this.fmdmService.getDefaultModel();
    }
  }

  /**
   * Set user's default model choice
   */
  async setDefaultModel(modelId: string, languages?: string[]): Promise<DefaultModelConfig> {
    try {
      // Validate the model ID exists in curated models
      const model = getModelById(modelId);
      if (!model) {
        throw new Error(`Invalid model ID: ${modelId}`);
      }

      this.logger.info(`[DefaultModelService] Setting default model: ${modelId}${languages ? ` with languages: ${languages.join(', ')}` : ''}`);

      // Create selection object for persistence (hardwareProfile omitted - not relevant for user selection)
      const selection: DefaultModelSelection = {
        modelId,
        selectedAt: new Date().toISOString(),
        selectionReason: 'User selected via settings',
        ...(languages && { languages }) // Include languages in persisted selection if provided
      };

      // Persist to configuration
      await this.configComponent.setDefaultModelSelection(selection);

      // Create the new default model config
      const newConfig: DefaultModelConfig = {
        modelId,
        source: 'user',
        ...(languages && { languages }) // Include languages in FMDM config if provided
      };

      // Update FMDM to broadcast to all clients
      this.fmdmService.updateDefaultModel(newConfig);

      this.logger.info(`[DefaultModelService] Default model set to: ${modelId} (source: user)`);

      return newConfig;

    } catch (error) {
      this.logger.error('[DefaultModelService] Failed to set default model:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Initialize the service during daemon startup
   * Sets the default model based on user preference or hardware recommendation
   */
  async initialize(curatedModels: CuratedModelInfo[], pythonAvailable: boolean): Promise<void> {
    try {
      this.logger.info('[DAEMON] Starting default model selection...');

      // Check if user has already set a preference
      const storedSelection = await this.configComponent.getDefaultModelSelection();

      if (storedSelection && storedSelection.modelId) {
        // User has an existing preference - use it (including languages if saved)
        this.logger.info(`[DAEMON] Using user's saved default model: ${storedSelection.modelId}${storedSelection.languages ? ` with languages: ${storedSelection.languages.join(', ')}` : ''}`);

        const config: DefaultModelConfig = {
          modelId: storedSelection.modelId,
          source: 'user',
          ...(storedSelection.languages && { languages: storedSelection.languages })
        };

        this.fmdmService.updateDefaultModel(config);
        return;
      }

      // No user preference - determine optimal model based on hardware
      this.logger.info('[DAEMON] Determining optimal default model...');

      const selector = new DefaultModelSelector(this.logger, curatedModels, pythonAvailable);
      const selection = await selector.determineOptimalDefault();

      this.logger.info(`[DAEMON] Selected default model: ${selection.modelId} (${selection.selectionReason})`);

      // Store the recommended selection (but NOT as user preference)
      // We only persist to config if user explicitly changes it

      // Update FMDM with recommended model
      const config: DefaultModelConfig = {
        modelId: selection.modelId,
        source: 'recommended'
      };

      this.fmdmService.updateDefaultModel(config);

    } catch (error) {
      this.logger.error('[DefaultModelService] Initialization failed:', error instanceof Error ? error : new Error(String(error)));
      // FMDM already has a safe default from buildInitialFMDM()
    }
  }

  /**
   * Get recommended model based on hardware (without changing user preference)
   */
  async getRecommendedModel(curatedModels: CuratedModelInfo[], pythonAvailable: boolean): Promise<string> {
    try {
      const selector = new DefaultModelSelector(this.logger, curatedModels, pythonAvailable);
      const selection = await selector.determineOptimalDefault();
      return selection.modelId;
    } catch (error) {
      this.logger.error('[DefaultModelService] Failed to get recommended model:', error instanceof Error ? error : new Error(String(error)));
      // Fail loud - use curated-models.json as source of truth, no hardcoded fallbacks
      return findSmallestCpuModel();
    }
  }
}

/**
 * Service token for Default Model Service
 */
export const DEFAULT_MODEL_SERVICE_TOKEN = Symbol('DefaultModelService');
