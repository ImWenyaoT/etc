export type Comparator<T> = (left: T, right: T) => number

type Color = 'red' | 'black'

type ChildSide = 'left' | 'right'

export interface TreeMetrics {
  readonly rotations: number
  readonly recolors: number
  readonly insertions: number
}

export interface ValidationResult {
  readonly valid: boolean
  readonly blackHeight: number
  readonly errors: string[]
}

class TreeNode<T> {
  value: T
  color: Color
  left: TreeNode<T> | null
  right: TreeNode<T> | null
  parent: TreeNode<T> | null

  constructor(value: T, color: Color) {
    this.value = value
    this.color = color
    this.left = null
    this.right = null
    this.parent = null
  }
}

interface ValidationWalk<T> {
  readonly blackHeight: number
  readonly min: T | null
  readonly max: T | null
}

export class RedBlackTree<T> {
  private root: TreeNode<T> | null = null
  private rotationCount = 0
  private recolorCount = 0
  private insertionCount = 0

  constructor(private readonly compare: Comparator<T>) {}

  insert(value: T): void {
    const node = new TreeNode(value, 'red')
    let parent: TreeNode<T> | null = null
    let current = this.root

    while (current !== null) {
      parent = current
      current = this.compare(value, current.value) < 0 ? current.left : current.right
    }

    node.parent = parent

    if (parent === null) {
      this.root = node
    } else if (this.compare(value, parent.value) < 0) {
      parent.left = node
    } else {
      parent.right = node
    }

    this.insertionCount += 1
    this.rebalanceAfterInsert(node)
  }

  toArray(): T[] {
    const values: T[] = []
    this.walkInOrder(this.root, values)
    return values
  }

  size(): number {
    return this.insertionCount
  }

  height(): number {
    return this.measureHeight(this.root)
  }

  metrics(): TreeMetrics {
    return {
      rotations: this.rotationCount,
      recolors: this.recolorCount,
      insertions: this.insertionCount,
    }
  }

  validate(): ValidationResult {
    const errors: string[] = []

    if (this.root === null) {
      return {
        valid: true,
        blackHeight: 1,
        errors,
      }
    }

    if (this.root.color !== 'black') {
      errors.push('Root must be black.')
    }

    const result = this.validateNode(this.root, errors)

    return {
      valid: errors.length === 0,
      blackHeight: result.blackHeight,
      errors,
    }
  }

  private rebalanceAfterInsert(node: TreeNode<T>): void {
    let current = node

    while (current.parent?.color === 'red') {
      const parent = current.parent
      const grandparent = parent.parent

      if (grandparent === null) {
        break
      }

      const parentSide = this.sideOf(parent, grandparent)
      const uncle = parentSide === 'left' ? grandparent.right : grandparent.left

      if (uncle?.color === 'red') {
        this.setColor(parent, 'black')
        this.setColor(uncle, 'black')
        this.setColor(grandparent, 'red')
        current = grandparent
        continue
      }

      if (parentSide === 'left') {
        if (current === parent.right) {
          current = parent
          this.rotateLeft(current)
        }

        this.setColor(current.parent, 'black')
        this.setColor(current.parent?.parent, 'red')
        this.rotateRight(current.parent?.parent ?? null)
      } else {
        if (current === parent.left) {
          current = parent
          this.rotateRight(current)
        }

        this.setColor(current.parent, 'black')
        this.setColor(current.parent?.parent, 'red')
        this.rotateLeft(current.parent?.parent ?? null)
      }
    }

    this.setColor(this.root, 'black')
  }

  private rotateLeft(node: TreeNode<T> | null): void {
    this.rotate(node, 'left')
  }

  private rotateRight(node: TreeNode<T> | null): void {
    this.rotate(node, 'right')
  }

  private rotate(node: TreeNode<T> | null, toward: ChildSide): void {
    if (node === null) {
      return
    }

    const childKey = toward === 'left' ? 'right' : 'left'
    const pivot = node[childKey]
    if (pivot === null) {
      return
    }

    node[childKey] = pivot[toward]
    if (pivot[toward] !== null) {
      pivot[toward]!.parent = node
    }

    pivot.parent = node.parent
    if (node.parent === null) {
      this.root = pivot
    } else if (node === node.parent.left) {
      node.parent.left = pivot
    } else {
      node.parent.right = pivot
    }

    pivot[toward] = node
    node.parent = pivot
    this.rotationCount += 1
  }

  private setColor(node: TreeNode<T> | null | undefined, color: Color): void {
    if (node === null || node === undefined || node.color === color) {
      return
    }

    node.color = color
    this.recolorCount += 1
  }

  private sideOf(node: TreeNode<T>, parent: TreeNode<T>): ChildSide {
    return parent.left === node ? 'left' : 'right'
  }

  private walkInOrder(node: TreeNode<T> | null, values: T[]): void {
    if (node === null) {
      return
    }

    this.walkInOrder(node.left, values)
    values.push(node.value)
    this.walkInOrder(node.right, values)
  }

  private measureHeight(node: TreeNode<T> | null): number {
    if (node === null) {
      return 0
    }

    return 1 + Math.max(this.measureHeight(node.left), this.measureHeight(node.right))
  }

  private validateNode(node: TreeNode<T> | null, errors: string[]): ValidationWalk<T> {
    if (node === null) {
      return {
        blackHeight: 1,
        min: null,
        max: null,
      }
    }

    const left = this.validateNode(node.left, errors)
    const right = this.validateNode(node.right, errors)

    if (left.max !== null && this.compare(left.max, node.value) > 0) {
      errors.push('BST order is broken on a left subtree.')
    }

    if (right.min !== null && this.compare(right.min, node.value) < 0) {
      errors.push('BST order is broken on a right subtree.')
    }

    if (node.color === 'red') {
      if (node.left?.color === 'red') {
        errors.push('A red node has a red left child.')
      }

      if (node.right?.color === 'red') {
        errors.push('A red node has a red right child.')
      }
    }

    if (left.blackHeight !== right.blackHeight) {
      errors.push('Black height differs between sibling subtrees.')
    }

    return {
      blackHeight: left.blackHeight + (node.color === 'black' ? 1 : 0),
      min: left.min ?? node.value,
      max: right.max ?? node.value,
    }
  }
}
