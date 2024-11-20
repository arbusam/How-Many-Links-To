import React, { useState, useEffect, useRef } from 'react';

// Type definitions
type FollowerMap = {
  [key: number]: number[];
};

interface Node {
  id: number;
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
  const initialData: FollowerMap = {
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
    const nodeCount = 10;
    const radius = 200;
    const centerX = 300;
    const centerY = 300;
    
    const nodeList: Node[] = Array.from({ length: nodeCount }, (_, i) => {
      const angle = (i * 2 * Math.PI) / nodeCount;
      return {
        id: i + 1,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    const linkList: Link[] = [];
    Object.entries(initialData).forEach(([source, targets]) => {
      targets.forEach(target => {
        linkList.push({
          source: parseInt(source),
          target
        });
      });
    });

    setNodes(nodeList);
    setLinks(linkList);
  }, []);

  const isAnyNodeVisible = (newTransform: Transform): boolean => {
    return nodes.some(node => {
      const transformedX = node.x * newTransform.scale + newTransform.x;
      const transformedY = node.y * newTransform.scale + newTransform.y;
      return transformedX >= 0 && transformedX <= 600 && transformedY >= 0 && transformedY <= 600;
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

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>): void => {
    if (!isDragging && !isPanning) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const svgWidth = rect.width;
    const svgHeight = rect.height;
    
    if (isDragging && dragNode !== null) {
      const x = ((e.clientX - rect.left) * (600 / svgWidth) - transform.x) / transform.scale;
      const y = ((e.clientY - rect.top) * (600 / svgHeight) - transform.y) / transform.scale;
      
      setNodes(prevNodes => 
        prevNodes.map(node => 
          node.id === dragNode 
            ? { 
                ...node, 
                x: Math.max(20, Math.min(580, x)),
                y: Math.max(20, Math.min(580, y))
              }
            : node
        )
      );
    } else if (isPanning) {
      const dx = (e.movementX * 600) / svgWidth;
      const dy = (e.movementY * 600) / svgHeight;
      
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
                {node.id}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default Graph;