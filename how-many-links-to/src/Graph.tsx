import React, { useState, useEffect, useRef } from 'react';

class User {
  id: number;
  username: string;
  followers: number[];

  constructor(id: number, username: string, followers: number[]) {
    this.id = id;
    this.username = username;
    this.followers = followers;
  }
}

let userArray: User[] = [];

// Generate users with random ids
for (let i = 0; i < 10; i++) {
  const id = Math.floor(Math.random() * 1000);
  const username = "test";
  userArray.push(new User(id, username, []));
}

// Assign random followers to each user
userArray.forEach(user => {
  const followerCount = Math.floor(Math.random() * userArray.length);
  const followers: number[] = [];

  while (followers.length < followerCount) {
    const randomUser = userArray[Math.floor(Math.random() * userArray.length)];
    if (randomUser.id !== user.id && !followers.includes(randomUser.id)) {
      followers.push(randomUser.id);
    }
  }

  user.followers = followers;
});

interface Node {
  id: number;
  label: string;
  x: number;
  y: number;
}

// Define screen dimensions
const screenWidth = window.innerWidth;
const screenHeight = window.innerHeight;

// Create nodes with random positions
let nodes: Node[] = userArray.map(user => ({
  id: user.id,
  label: user.username,
  x: Math.random() * screenWidth,
  y: Math.random() * screenHeight,
}));

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
  // Create links based on followers
  const links: Link[] = [];
  userArray.forEach(user => {
    user.followers.forEach(followerId => {
      links.push({
        source: user.id,
        target: followerId,
      });
    });
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>(userArray.map(user => ({
    id: user.id,
    label: user.username,
    x: 300,
    y: 300,
  })));
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragNode, setDragNode] = useState<number | null>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [viewportDimensions, setViewportDimensions] = useState({ width: 600, height: 600 });

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
    const mouseX = (e.clientX - rect.left) * (viewportDimensions.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (viewportDimensions.height / rect.height);

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

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setViewportDimensions({ width, height });
      }
    };

    // Initial dimension setup
    updateDimensions();

    // Add resize listener
    window.addEventListener('resize', updateDimensions);

    // Cleanup
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="graph-container"
    >
      <svg 
        viewBox={`0 0 ${viewportDimensions.width} ${viewportDimensions.height}`} 
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