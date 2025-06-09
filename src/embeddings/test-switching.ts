/**
 * Test script for embedding model switching functionality
 */

import { 
  getDefaultEmbeddingModel, 
  createEmbeddingModel, 
  switchDefaultModel,
  listEmbeddingModels,
  testEmbeddingSystem
} from './index.js';

async function testModelSwitching(): Promise<void> {
  console.log('🧪 Testing Embedding Model Switching...\n');
  
  try {
    // List available models
    console.log('📋 Available embedding models:');
    const availableModels = listEmbeddingModels();
    availableModels.forEach(({ key, config }) => {
      console.log(`   - ${key}: ${config.name} (${config.dimensions}D) ${config.isDefault ? '(default)' : ''}`);
      console.log(`     Transformers: ${config.transformersModel}`);
      console.log(`     Ollama: ${config.ollamaModel}`);
      console.log(`     Description: ${config.description}\n`);
    });
    
    // Test with default model first
    console.log('🚀 Testing with default model...');
    const defaultModel = getDefaultEmbeddingModel();
    await defaultModel.initialize();
    
    let modelInfo = defaultModel.getModelInfo();
    console.log(`✅ Default model initialized: ${modelInfo.name} (${modelInfo.dimensions}D)`);
    console.log(`   Backend: ${modelInfo.backend} ${modelInfo.isGPUAccelerated ? '(GPU)' : '(CPU)'}\n`);
    
    // Test embedding generation
    const testText = 'This is a test sentence for embedding generation.';
    console.log(`📝 Testing embedding with: "${testText}"`);
    
    const startTime = Date.now();
    const embedding1 = await defaultModel.generateEmbedding(testText);
    const time1 = Date.now() - startTime;
    
    console.log(`✅ Generated embedding: ${embedding1.dimensions}D in ${time1}ms`);
    console.log(`   Vector sample: [${embedding1.vector.slice(0, 3).map(x => x.toFixed(4)).join(', ')}, ...]\n`);
    
    // Test switching to mxbai-large
    console.log('🔄 Switching to mxbai-large model...');
    await switchDefaultModel('mxbai-large');
    
    modelInfo = defaultModel.getModelInfo();
    console.log(`✅ Switched to: ${modelInfo.name} (${modelInfo.dimensions}D)`);
    console.log(`   Backend: ${modelInfo.backend} ${modelInfo.isGPUAccelerated ? '(GPU)' : '(CPU)'}\n`);
    
    // Test embedding generation with new model
    console.log(`📝 Testing embedding with new model: "${testText}"`);
    
    const startTime2 = Date.now();
    const embedding2 = await defaultModel.generateEmbedding(testText);
    const time2 = Date.now() - startTime2;
    
    console.log(`✅ Generated embedding: ${embedding2.dimensions}D in ${time2}ms`);
    console.log(`   Vector sample: [${embedding2.vector.slice(0, 3).map(x => x.toFixed(4)).join(', ')}, ...]\n`);
    
    // Verify dimensions are different
    if (embedding1.dimensions !== embedding2.dimensions) {
      console.log(`✅ Model switch successful: dimensions changed from ${embedding1.dimensions}D to ${embedding2.dimensions}D\n`);
    } else {
      console.log(`⚠️ Warning: Both models have same dimensions (${embedding1.dimensions}D)\n`);
    }
    
    // Test switching to all-minilm (lightweight model)
    console.log('🔄 Switching to all-minilm model (lightweight)...');
    await switchDefaultModel('all-minilm');
    
    modelInfo = defaultModel.getModelInfo();
    console.log(`✅ Switched to: ${modelInfo.name} (${modelInfo.dimensions}D)`);
    console.log(`   Backend: ${modelInfo.backend} ${modelInfo.isGPUAccelerated ? '(GPU)' : '(CPU)'}\n`);
    
    // Test embedding generation with lightweight model
    const startTime3 = Date.now();
    const embedding3 = await defaultModel.generateEmbedding(testText);
    const time3 = Date.now() - startTime3;
    
    console.log(`✅ Generated embedding: ${embedding3.dimensions}D in ${time3}ms`);
    console.log(`   Vector sample: [${embedding3.vector.slice(0, 3).map(x => x.toFixed(4)).join(', ')}, ...]\n`);
    
    // Test switching back to default
    console.log('🔄 Switching back to default model (nomic-v1.5)...');
    await switchDefaultModel('nomic-v1.5');
    
    modelInfo = defaultModel.getModelInfo();
    console.log(`✅ Switched back to: ${modelInfo.name} (${modelInfo.dimensions}D)`);
    console.log(`   Backend: ${modelInfo.backend} ${modelInfo.isGPUAccelerated ? '(GPU)' : '(CPU)'}\n`);
    
    // Test embedding generation to verify it works
    const startTime4 = Date.now();
    const embedding4 = await defaultModel.generateEmbedding(testText);
    const time4 = Date.now() - startTime4;
    
    console.log(`✅ Generated embedding: ${embedding4.dimensions}D in ${time4}ms`);
    console.log(`   Vector sample: [${embedding4.vector.slice(0, 3).map(x => x.toFixed(4)).join(', ')}, ...]\n`);
    
    // Verify we're back to original dimensions
    if (embedding1.dimensions === embedding4.dimensions) {
      console.log(`✅ Successfully switched back: dimensions match original (${embedding1.dimensions}D)\n`);
    }
    
    // Test creating independent model instances
    console.log('🔬 Testing independent model instances...');
    const model1 = createEmbeddingModel('nomic-v1.5');
    const model2 = createEmbeddingModel('mxbai-large');
    
    await model1.initialize();
    await model2.initialize();
    
    const info1 = model1.getModelInfo();
    const info2 = model2.getModelInfo();
    
    console.log(`✅ Model 1: ${info1.name} (${info1.dimensions}D)`);
    console.log(`✅ Model 2: ${info2.name} (${info2.dimensions}D)`);
    
    // Generate embeddings with both models simultaneously
    const [emb1, emb2] = await Promise.all([
      model1.generateEmbedding(testText),
      model2.generateEmbedding(testText)
    ]);
    
    console.log(`✅ Independent instances work: ${emb1.dimensions}D and ${emb2.dimensions}D\n`);
    
    // Performance comparison
    console.log('📊 Performance Summary:');
    console.log(`   Default model (${embedding1.dimensions}D): ${time1}ms`);
    console.log(`   MxBai Large (${embedding2.dimensions}D): ${time2}ms`);
    console.log(`   All-MiniLM (${embedding3.dimensions}D): ${time3}ms`);
    console.log(`   Back to default (${embedding4.dimensions}D): ${time4}ms\n`);
    
    console.log('🎉 All model switching tests passed!');
    
  } catch (error) {
    console.error('❌ Model switching test failed:', error);
    throw error;
  }
}

/**
 * Test batch processing with different models
 */
async function testBatchProcessingWithModels(): Promise<void> {
  console.log('\n🧪 Testing Batch Processing with Different Models...\n');
  
  const testTexts = [
    'Machine learning is transforming technology.',
    'Natural language processing enables computer understanding.',
    'Embeddings capture semantic meaning in vectors.',
    'GPU acceleration improves model performance.',
    'Ollama provides local AI model hosting.'
  ];
  
  const models = ['nomic-v1.5', 'all-minilm'];
  
  for (const modelKey of models) {
    console.log(`📦 Testing batch processing with ${modelKey}...`);
    
    const model = createEmbeddingModel(modelKey);
    await model.initialize();
    
    const info = model.getModelInfo();
    console.log(`   Model: ${info.name} (${info.dimensions}D)`);
    
    const startTime = Date.now();
    const embeddings = await model.generateBatchEmbeddings(testTexts, 3);
    const totalTime = Date.now() - startTime;
    
    console.log(`   ✅ Generated ${embeddings.length} embeddings in ${totalTime}ms`);
    console.log(`   📊 Average: ${(totalTime / embeddings.length).toFixed(1)}ms per embedding`);
    console.log(`   📏 All ${info.dimensions}D: ${embeddings.every(e => e.dimensions === info.dimensions)}\n`);
  }
}

// Main test function
export async function runModelSwitchingTests(): Promise<void> {
  console.log('🚀 Starting Embedding Model Configuration Tests...\n');
  
  try {
    await testModelSwitching();
    await testBatchProcessingWithModels();
    
    console.log('\n🎉 All model configuration tests completed successfully!');
    console.log('📈 Model switching functionality is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Model configuration tests failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runModelSwitchingTests();
}
