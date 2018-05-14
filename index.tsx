import { h, app } from 'hyperapp'
import devtools from 'hyperapp-devtools'
import { map, omit, some, pick, keyBy, mapValues, filter, reduce, values, max } from 'lodash-es'
import { unflatten } from './un-flatten-tree'

type Node = {
  id: string
  parentId?: string
}

type OutNode = {
  id: string
  children: OutNode[]
}

let groupIdCounter = 1
let clusterIdCounter = 1

const state = {
  groups: {
    [groupIdCounter]: { id: String(groupIdCounter++), name: 'Street A' },
    [groupIdCounter]: { id: String(groupIdCounter++), name: 'Street B' },
    [groupIdCounter]: { id: String(groupIdCounter++), name: 'Street C' },
    [groupIdCounter]: { id: String(groupIdCounter++), name: 'Street D' },
    [groupIdCounter]: { id: String(groupIdCounter++), name: 'Street E' },
    [groupIdCounter]: { id: String(groupIdCounter++), name: 'Street F' },
    [groupIdCounter]: { id: String(groupIdCounter++), name: 'Street G' },
    [groupIdCounter]: { id: String(groupIdCounter++), name: 'Street H' }
  },
  clusters: {},
  selectedGroupIds: {},
  selectedClusterIds: {},
  parentIdByGroupId: {},
  parentIdByClusterId: {}
}

type IdMap = {
  [id: string]: string
}

const buildTree = (parentIdByGroupId: IdMap, parentIdByClusterId: IdMap, topClusterIds: string[]) => {
  const groups: Node[] = map(parentIdByGroupId, (parentId, id) => ({
    parentId: 'cluster-' + parentId,
    id: 'group-' + id
  }))
  const clusters: Node[] = map(parentIdByClusterId, (parentId, id) => ({
    parentId: 'cluster-' + parentId,
    id: 'cluster-' + id
  }))
  const topNodes: Node[] = topClusterIds.map((id) => ({
    id: 'cluster-' + id
  }))

  const array: Node[] = groups.concat(clusters).concat(topNodes)

  // return unflatten(groups.concat(clusters))
  return unflatten<Node, OutNode>(
    array,
    (node, parentNode) => node.parentId === parentNode.id,
    (node, parentNode) => parentNode.children.push(node),
    (node) => ({ id: node.id, children: [] })
  )
}

const actions = {
  addGroup: (group) => (state) => {
    const newState = { ...state, groupName: '', groups: { ...state.groups, [group.id]: group } }
    return newState
  },
  addCluster: (cluster) => (state) => {
    const newState = {
      ...state,
      clusterName: '',
      clusters: { ...state.clusters, [cluster.id]: pick(cluster, 'id', 'name') },
      selectedClusterIds: {},
      selectedGroupIds: {},
      parentIdByGroupId: { ...state.parentIdByGroupId, ...mapValues(keyBy(cluster.groupIds), () => cluster.id) },
      parentIdByClusterId: { ...state.parentIdByClusterId, ...mapValues(keyBy(cluster.clusterIds), () => cluster.id) }
    }
    return newState
  },
  setFieldValue: ({ field, value }) => (state) => ({ ...state, [field]: value }),
  toggleSelectGroup: (groupId) => (state) => ({
    ...state,
    selectedGroupIds: state.selectedGroupIds[groupId]
      ? omit(state.selectedGroupIds, groupId)
      : { ...state.selectedGroupIds, [groupId]: true }
  }),
  toggleSelectCluster: (clusterId) => (state) => ({
    ...state,
    selectedClusterIds: state.selectedClusterIds[clusterId]
      ? omit(state.selectedClusterIds, clusterId)
      : { ...state.selectedClusterIds, [clusterId]: true }
  })
}

function calculateHeight ({ children }) {
  if (children.length === 0) return 1
  const heights = children.map(calculateHeight)
  return max<number>(heights) + 1
}

const NodeItem = ({ node, depth = 1 }: { node: OutNode; depth: number }) => (state, actions) => {
  const [ type, id ] = node.id.split('-')
  const isCluster = type === 'cluster'
  const isSelected = Boolean(isCluster ? state.selectedClusterIds[id] : state.selectedGroupIds[id])
  const item = isCluster ? state.clusters[id] : state.groups[id]
  const toggleSelect = isCluster ? actions.toggleSelectCluster : actions.toggleSelectGroup
  const height = calculateHeight(node)
  return (
    <div
      key={node.id}
      style={{
        marginLeft: `1rem`
      }}>
      <label
        style={{
          cursor: 'pointer'
        }}>
        <input
          type="checkbox"
          onclick={(e: Event) => {
            e.stopPropagation()
            toggleSelect(id)
          }}
          checked={isSelected}
        />
        {item.name} (depth {depth}, height {height})
        {node.children.map((child) => <NodeItem node={child} depth={depth + 1} />)}
      </label>
    </div>
  )
}

const view = (state, actions) => {
  const unassignedGroups = filter(state.groups, (group) => !state.parentIdByGroupId[group.id])
  const topClusters = filter(state.clusters, (cluster) => !Object.keys(state.parentIdByClusterId).includes(cluster.id))
  const topClusterIds = map(topClusters, 'id')

  const tree = buildTree(state.parentIdByGroupId, state.parentIdByClusterId, topClusterIds)

  const topLevelItems = tree.length === 0 ? values(state.groups) : map(topClusterIds, (id) => state.clusters[id])

  const topLevelOccupancy = topLevelItems
    .map((item) => ({
      name: item.name,
      occupancy: Math.random()
    }))
    .concat({
      name: 'Unassigned',
      occupancy: Math.random()
    })

  return (
    <div>
      <h1>Groups</h1>
      <div style={{ display: 'flex' }}>
        <form
          onsubmit={(e) => {
            e.preventDefault()
            if (state.groupName) {
              actions.addGroup({ name: state.groupName, id: String(groupIdCounter++) })
            }
            return false
          }}>
          <input
            value={state.groupName}
            oninput={(e) => actions.setFieldValue({ field: 'groupName', value: e.currentTarget.value })}
          />
          <button type="submit">Add group</button>
        </form>
        <form
          style={{ marginLeft: '1rem' }}
          onsubmit={(e) => {
            e.preventDefault()
            if (state.clusterName && (some(state.selectedGroupIds) || some(state.selectedClusterIds))) {
              actions.addCluster({
                name: state.clusterName,
                id: String(clusterIdCounter++),
                groupIds: Object.keys(state.selectedGroupIds),
                clusterIds: Object.keys(state.selectedClusterIds)
              })
            }
            return false
          }}>
          <input
            value={state.clusterName}
            oninput={(e) => actions.setFieldValue({ field: 'clusterName', value: e.currentTarget.value })}
          />
          <button disabled={!some(state.selectedGroupIds) && !some(state.selectedClusterIds)} type="submit">
            Add cluster
          </button>
        </form>
      </div>
      <div
        style={{
          marginTop: '1rem'
        }}>
        {reduce(
          tree,
          (prev, curr) => {
            prev.push(<NodeItem node={curr} />)
            return prev
          },
          []
        )}
        {map(unassignedGroups, (group) => (
          <div key={'group-' + group.id} style={{ marginLeft: '1rem' }}>
            <label style={{ cursor: 'pointer' }} onclick={(e) => actions.toggleSelectGroup(group.id)}>
              <input type="checkbox" onclick={(e) => actions.toggleSelectGroup(group.id)} />
              {group.name} (depth 1, height 1)
            </label>
          </div>
        ))}
      </div>
      <div>
        <h2>Occupancy</h2>
        {map(topLevelOccupancy, (item) => (
          <div>
            <div>{item.name}</div>
            <div style={{ background: 'blue', width: `${item.occupancy * 200}px` }}>&nbsp;</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const wrapper = location.search.indexOf('debug') >= 0 ? devtools(app) : app

wrapper(state, actions, view, document.body)
