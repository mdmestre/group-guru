/**
 * Workflow Builder Component
 * Visual drag-and-drop automation builder using React Flow
 * Phase 3: Intelligent Automations
 */

import React, { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
  NodeTypes,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, Play, Trash2, Settings } from 'lucide-react';
import type {
  FlowDefinition,
  FlowNode,
  FlowEdge,
  TriggerType,
  ActionType,
  NodeType
} from '../models/types';

interface WorkflowBuilderProps {
  initialFlow?: FlowDefinition;
  onSave?: (flow: FlowDefinition) => void;
  onTest?: () => void;
  readOnly?: boolean;
}

// Custom node components
const TriggerNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow-md min-w-[150px]">
      <div className="font-semibold text-sm">Trigger</div>
      <div className="text-xs mt-1 opacity-90">{data.label || data.triggerType}</div>
    </div>
  );
};

const ActionNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 bg-green-500 text-white rounded-lg shadow-md min-w-[150px]">
      <div className="font-semibold text-sm">Action</div>
      <div className="text-xs mt-1 opacity-90">{data.label || data.actionType}</div>
    </div>
  );
};

const ConditionNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 bg-yellow-500 text-white rounded-lg shadow-md min-w-[150px]">
      <div className="font-semibold text-sm">Condition</div>
      <div className="text-xs mt-1 opacity-90">{data.label || 'If/Else'}</div>
    </div>
  );
};

const DelayNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-2 bg-purple-500 text-white rounded-lg shadow-md min-w-[150px]">
      <div className="font-semibold text-sm">Delay</div>
      <div className="text-xs mt-1 opacity-90">{data.label || 'Wait'}</div>
    </div>
  );
};

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode
};

export function WorkflowBuilder({
  initialFlow,
  onSave,
  onTest,
  readOnly = false
}: WorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialFlow?.nodes || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialFlow?.edges || []
  );
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [newNodeType, setNewNodeType] = useState<NodeType>('action');

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsNodeDialogOpen(true);
  }, []);

  const handleAddNode = useCallback(() => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type: newNodeType,
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100
      },
      data: {
        label: `New ${newNodeType}`,
        ...(newNodeType === 'trigger' && { triggerType: 'message_received' }),
        ...(newNodeType === 'action' && { actionType: 'send_message' })
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setIsNodeDialogOpen(false);
  }, [newNodeType, setNodes]);

  const handleSave = useCallback(() => {
    const flow: FlowDefinition = {
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[]
    };
    onSave?.(flow);
  }, [nodes, edges, onSave]);

  const handleDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      );
      setSelectedNode(null);
      setIsNodeDialogOpen(false);
    }
  }, [selectedNode, setNodes, setEdges]);

  return (
    <div className="w-full h-[800px] relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <MiniMap />
        <Panel position="top-left" className="bg-white p-2 rounded shadow-lg">
          <div className="flex gap-2">
            <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={readOnly}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Node
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedNode ? 'Edit Node' : 'Add New Node'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedNode
                      ? 'Configure the selected node'
                      : 'Select a node type to add'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {!selectedNode && (
                    <div>
                      <Label>Node Type</Label>
                      <Select
                        value={newNodeType}
                        onValueChange={(value) =>
                          setNewNodeType(value as NodeType)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trigger">Trigger</SelectItem>
                          <SelectItem value="action">Action</SelectItem>
                          <SelectItem value="condition">Condition</SelectItem>
                          <SelectItem value="delay">Delay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {!selectedNode && (
                      <Button onClick={handleAddNode} className="flex-1">
                        Add
                      </Button>
                    )}
                    {selectedNode && (
                      <>
                        <Button
                          onClick={handleDeleteNode}
                          variant="destructive"
                          className="flex-1"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                        <Button
                          onClick={() => setIsNodeDialogOpen(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Close
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {!readOnly && (
              <>
                <Button size="sm" onClick={handleSave}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                {onTest && (
                  <Button size="sm" variant="outline" onClick={onTest}>
                    <Play className="h-4 w-4 mr-2" />
                    Test
                  </Button>
                )}
              </>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

