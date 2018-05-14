const map = Array.prototype.map;
const reduce = Array.prototype.reduce;

const find = <T>(list: ArrayLike<T>, predicate: (item: T) => boolean) => {
  const len = list.length;

  for (let i = 0; i < len; i++) {
    if (predicate(list[i])) {
      return list[i];
    }
  }

  return undefined;
};

/**
 * Converts tree to list.
 *
 * @param tree Array-like object representing tree.
 * @param getChildNodes Function to return child nodes.
 * @param convertNode Function to modify each item of result list.
 * @param generateId Function to generate unique ids for each item of result list.
 * @return Returns list of out nodes.
 */
export function flatten<Node, OutNode, Id>(
  tree: ArrayLike<Node>,
  getChildNodes: (node: Node) => ArrayLike<Node>,
  convertNode: (
    node: Node,
    parentNode?: Node,
    nodeId?: Id,
    parentNodeId?: Id
  ) => OutNode = (node: Node & OutNode) => node,
  generateId: (node: Node) => Id = () => undefined
): OutNode[] {
  const stack = tree && tree.length ? [{ pointer: tree, offset: 0 }] : [];
  const flat: OutNode[] = [];
  let current: { pointer: ArrayLike<Node>; offset: number; node?: Node; nodeId?: Id };

  while (stack.length) {
    current = stack.pop();

    while (current.offset < current.pointer.length) {
      const node = current.pointer[current.offset];
      const nodeId = generateId(node);
      const children = getChildNodes(node);

      flat.push(convertNode(node, current.node, nodeId, current.nodeId));

      current.offset += 1;

      if (children) {
        stack.push(current);

        current = {
          pointer: children,
          offset: 0,
          node,
          nodeId
        };
      }
    }
  }

  return flat;
}

/**
 * Converts list to tree.
 *
 * @param list Array-like object representing list.
 * @param isChildNode Function to check for child-parent relation.
 * @param addChildNode Function to add out node to its parent node.
 * @param convertNode Function to modify each node of resulting tree.
 * @return Returns tree of out nodes.
 */
export function unflatten<Node>(
  list: ArrayLike<Node>,
  isChildNode: (node: Node, parentNode: Node) => boolean,
  addChildNode: (node: Node, parentNode: Node) => void
): Node[];

export function unflatten<Node, OutNode>(
  list: ArrayLike<Node>,
  isChildNode: (node: Node, parentNode: Node) => boolean,
  addChildNode: (node: OutNode, parentNode: OutNode) => void,
  convertNode: (node: Node) => OutNode
): OutNode[];

export function unflatten<Node, OutNode>(
  list: ArrayLike<Node>,
  isChildNode: (node: Node, parentNode: Node) => boolean,
  addChildNode: (node: Node | OutNode, parentNode: Node | OutNode) => void,
  convertNode?: (node: Node) => OutNode
): Array<Node | OutNode> {
  if (convertNode === undefined) {
    return reduce.call(
      list,
      (tree: Node[], node: Node) => {
        const parentNode = find(list, parent => isChildNode(node, parent));

        if (parentNode === undefined) {
          tree.push(node);
        } else {
          addChildNode(node, parentNode);
        }

        return tree;
      },
      []
    );
  } else {
    const mappedList: { in: Node; out: OutNode }[] = map.call(list, (node: Node) => ({
      in: node,
      out: convertNode(node)
    }));

    return reduce.call(
      mappedList,
      (tree: OutNode[], node: { in: Node; out: OutNode }) => {
        const parentNode = find(mappedList, parent => isChildNode(node.in, parent.in));

        if (parentNode === undefined) {
          tree.push(node.out);
        } else {
          addChildNode(node.out, find(mappedList, treeNode => treeNode.in === parentNode.in).out);
        }

        return tree;
      },
      []
    );
  }
}