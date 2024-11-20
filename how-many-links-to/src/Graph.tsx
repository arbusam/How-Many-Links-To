import React, { useState, useEffect, useRef } from 'react';

// // Type definitions
// type FollowerMap = {
//   [key: string]: number[];
// };

class FollowerMap {
  numberDict: { [key: number]: number[] };
  stringDict: { [key: number]: string };

  constructor() {
    this.numberDict = {};
    this.stringDict = {};
  }
}

interface Node {
  id: number;
  label: string;
  x: number;
  y: number;
}

interface Link {
  source: number;
  target: number;
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const Graph: React.FC = () => {
  // Sample data structure
  const initialData: FollowerMap = new FollowerMap();
  initialData.numberDict = {
    1: [3, 5, 8],
    2: [4, 6],
    3: [7, 9],
    4: [8],
    5: [2, 6],
    6: [10],
    7: [1],
    8: [3],
    9: [5],
    10: [4]
  };
  initialData.stringDict = {
    1: "alpha",
    2: "bravo",
    3: "charlie",
    4: "delta",
    5: "echo",
    6: "foxtrot",
    7: "golf",
    8: "hotel",
    9: "india",
    10: "juliet"
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragNode, setDragNode] = useState<number | null>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Prevent scrolling on the container
  useEffect(() => {
    const preventDefault = (e: WheelEvent) => {
      e.preventDefault();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', preventDefault, { passive: false });
      return () => container.removeEventListener('wheel', preventDefault);
    }
  }, []);

  // Initialize the graph
  useEffect(() => {
    const nodeCount = Object.keys(initialData.numberDict).length;
    const radius = 200;
    const centerX = 300;
    const centerY = 300;
    const nodeList: Node[] = Array.from({ length: nodeCount }, (_, i) => {
      const angle = (i * 2 * Math.PI) / nodeCount;
      return {
        id: i + 1,
        label: initialData.stringDict[i+1],
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    const linkList: Link[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = 0; j < initialData.numberDict[i+1].length; j++) {
        linkList.push({
          source: i + 1,
          target: initialData.numberDict[i+1][j]
        });
      }
    }

    setNodes(nodeList);
    setLinks(linkList);
  }, []);

  // Update isAnyNodeVisible to be more permissive
  const isAnyNodeVisible = (newTransform: Transform): boolean => {
    const buffer = 1000; // Add a buffer zone around viewport
    return nodes.some(node => {
      const transformedX = node.x * newTransform.scale + newTransform.x;
      const transformedY = node.y * newTransform.scale + newTransform.y;
      return transformedX >= -buffer && 
             transformedX <= 600 + buffer && 
             transformedY >= -buffer && 
             transformedY <= 600 + buffer;
    });
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>): void => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (600 / rect.width);
    const mouseY = (e.clientY - rect.top) * (600 / rect.height);

    const delta = -e.deltaY;
    const scaleFactor = delta > 0 ? 1.1 : 1 / 1.1;
    const newScale = transform.scale * scaleFactor;

    // Calculate new transform
    const newTransform = {
      scale: newScale,
      x: mouseX - (mouseX - transform.x) * scaleFactor,
      y: mouseY - (mouseY - transform.y) * scaleFactor
    };

    // Only apply the transform if at least one node would be visible
    if (isAnyNodeVisible(newTransform)) {
      setTransform(newTransform);
    }
  };

  const handleMouseDown = (nodeId: number | null, e: React.MouseEvent<SVGElement>): void => {
    e.preventDefault();
    if (nodeId !== null) {
      setIsDragging(true);
      setDragNode(nodeId);
    } else {
      setIsPanning(true);
    }
  };

  // Update handleMouseMove to remove position constraints
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>): void => {
    if (!isDragging && !isPanning) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (600 / rect.width);
    const mouseY = (e.clientY - rect.top) * (600 / rect.height);

    if (isDragging && dragNode !== null) {
      // Calculate new position without constraints
      const newX = (mouseX - transform.x) / transform.scale;
      const newY = (mouseY - transform.y) / transform.scale;
      
      setNodes(nodes.map(node => 
        node.id === dragNode 
          ? { ...node, x: newX, y: newY }
          : node
      ));
    } else if (isPanning) {
      const dx = (e.movementX * 600) / rect.width;
      const dy = (e.movementY * 600) / rect.height;
      
      const newTransform = {
        ...transform,
        x: transform.x + dx,
        y: transform.y + dy
      };

      // Only apply the transform if at least one node would be visible
      if (isAnyNodeVisible(newTransform)) {
        setTransform(newTransform);
      }
    }
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
    setDragNode(null);
    setIsPanning(false);
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full max-w-2xl mx-auto p-4 overflow-hidden"
    >
      <svg 
        viewBox="0 0 600 600" 
        className="w-full border border-gray-200 rounded-lg"
        onWheel={handleWheel}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onMouseDown={(e) => handleMouseDown(null, e)}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* Draw links */}
          {links.map((link) => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            if (!sourceNode || !targetNode) return null;
            
            return (
              <line
                key={`${link.source}-${link.target}`}
                x1={sourceNode.x}
                y1={sourceNode.y}
                x2={targetNode.x}
                y2={targetNode.y}
                stroke="#999"
                strokeWidth={1 / transform.scale}
              />
            );
          })}
          
          {/* Draw nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={20 / transform.scale}
                fill="#3b82f6"
                stroke="#1d4ed8"
                strokeWidth={2 / transform.scale}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                className="cursor-pointer"
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dy=".3em"
                fill="white"
                fontSize={`${12 / transform.scale}px`}
                pointerEvents="none"
              >
                {node.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default Graph;