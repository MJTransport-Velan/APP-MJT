/**
 * Shared materialized-path helpers for self-referential tree models
 * (AccountGroup, CostCenter). Both store `path` as a "/"-joined chain of
 * ancestor ids (empty string for a root) and `level` as depth from root —
 * this module is the single place that math is done, instead of being
 * duplicated per model.
 */

export interface HierarchyNode {
  id: string;
  path: string;
  level: number;
}

/** Computes the path/level a node should have given its (possibly null) parent. */
export function computeHierarchyPosition(parent: HierarchyNode | null): { path: string; level: number } {
  if (!parent) {
    return { path: '', level: 0 };
  }
  return { path: `${parent.path}${parent.id}/`, level: parent.level + 1 };
}

/**
 * True if parenting `candidateId` under `newParent` would make `candidateId`
 * an ancestor of itself — i.e. newParent IS candidateId, or newParent's own
 * ancestor chain already contains candidateId.
 */
export function wouldCreateCycle(candidateId: string, newParent: HierarchyNode): boolean {
  if (newParent.id === candidateId) return true;
  const ancestorIds = newParent.path.split('/').filter(Boolean);
  return ancestorIds.includes(candidateId);
}

interface TreeDelegate {
  findMany(args: { where: Record<string, unknown> }): Promise<Array<{ id: string }>>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
}

/**
 * After a node's own path/level changes (created or re-parented), every
 * descendant's path/level is stale and must be rewritten to match — this
 * walks the subtree and fixes each one. Callers run this inside the same
 * transaction as the node's own update so the tree is never left half-moved.
 */
export async function rebuildDescendantPaths(params: {
  delegate: TreeDelegate;
  parentField: string;
  nodeId: string;
  nodePath: string;
  nodeLevel: number;
}): Promise<void> {
  const { delegate, parentField, nodeId, nodePath, nodeLevel } = params;
  const children = await delegate.findMany({ where: { [parentField]: nodeId } });

  for (const child of children) {
    const childPath = `${nodePath}${nodeId}/`;
    const childLevel = nodeLevel + 1;
    await delegate.update({ where: { id: child.id }, data: { path: childPath, level: childLevel } });
    await rebuildDescendantPaths({ delegate, parentField, nodeId: child.id, nodePath: childPath, nodeLevel: childLevel });
  }
}
