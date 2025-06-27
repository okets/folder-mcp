/**
 * Marker interface for components that handle their own width constraints.
 * Components implementing this interface will not be truncated by parent containers.
 */
export interface ISelfConstrainedItem {
    readonly selfConstrained: true;
}