import React, { useMemo, useState } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

import attackPaths from "../attack_paths.json";
import { emotionFaces } from "../emotionFaces";

const nodeBaseStyle = {
  background: "rgba(0, 40, 0, 0.85)",
  color: "#9fffe0",
  border: "2px solid #00ff90",
  borderRadius: "12px",
  padding: 16,
  fontFamily: "'Share Tech Mono', monospace",
  boxShadow: "0 0 12px rgba(0, 255, 144, 0.35)",
};

const edgeBaseStyle = {
  stroke: "#00ff90",
  strokeWidth: 2,
};

function AttackMap() {
  const [selectedNode, setSelectedNode] = useState(null);

  const nodes = useMemo(
    () =>
      attackPaths.nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: {
          label: `${emotionFaces[node.emotion] || emotionFaces.neutral}  ${node.label}`,
          description: node.details,
          checkpoints: node.checkpoints,
          emotion: node.emotion,
          detection: node.detection,
          mitigation: node.mitigation,
        },
        style: {
          ...nodeBaseStyle,
          borderColor: node.highlight ? "#32ff8a" : nodeBaseStyle.border,
          boxShadow: node.highlight
            ? "0 0 18px rgba(0, 255, 144, 0.55)"
            : nodeBaseStyle.boxShadow,
        },
      })),
    []
  );

  const edges = useMemo(
    () =>
      attackPaths.edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        labelStyle: {
          fill: "#7cffc9",
          fontWeight: 600,
          fontSize: 12,
          textTransform: "uppercase",
        },
        style: {
          ...edgeBaseStyle,
          strokeDasharray: edge.dashed ? "6 4" : undefined,
        },
        animated: edge.animated,
      })),
    []
  );

  const onNodeClick = (_, node) => {
    setSelectedNode({
      id: node.id,
      label: attackPaths.nodes.find((item) => item.id === node.id)?.label || node.data.label,
      ...node.data,
    });
  };

  return (
    <div className="matrix-card attack-map">
      <div className="panel-header">
        <h2>Attack Path Visualizer</h2>
        <p className="panel-subtitle">
          Navigate the adversary's journey and inspect each hop for deeper intelligence.
        </p>
      </div>
      <div className="attack-map__body">
        <div className="attack-map__canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            onNodeClick={onNodeClick}
            className="matrix-reactflow"
          >
            <Background
              id="matrix"
              gap={32}
              color="rgba(0, 255, 144, 0.1)"
              variant="dots"
            />
            <Controls style={{ color: "#00ff90" }} />
            <MiniMap
              nodeColor={() => "#00ff90"}
              maskColor="rgba(0, 0, 0, 0.8)"
              style={{ background: "rgba(0, 16, 0, 0.9)" }}
            />
          </ReactFlow>
        </div>
        <aside className="attack-map__details">
          {selectedNode ? (
            <div>
              <h3>
                {emotionFaces[selectedNode.emotion] || emotionFaces.neutral}{" "}
                {selectedNode.label}
              </h3>
              <p className="details-text">{selectedNode.description}</p>
              {selectedNode.checkpoints?.length ? (
                <div className="details-section">
                  <h4>Adversary Checklist</h4>
                  <ul>
                    {selectedNode.checkpoints.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selectedNode.detection?.length ? (
                <div className="details-section">
                  <h4>Detection Notes</h4>
                  <ul>
                    {selectedNode.detection.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {selectedNode.mitigation?.length ? (
                <div className="details-section">
                  <h4>Mitigation Advice</h4>
                  <ul>
                    {selectedNode.mitigation.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="details-placeholder">
              <span className="details-placeholder__face">{emotionFaces.neutral}</span>
              <p>Select a node to reveal situational intel.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default AttackMap;
