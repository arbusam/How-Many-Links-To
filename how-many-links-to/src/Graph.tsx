import React, { useState, useEffect, useRef } from 'react';

class User {
  id: string;
  username: string;
  followers: string[];

  constructor(id: string, username: string, followers: string[]) {
    this.id = id;
    this.username = username;
    this.followers = followers;
  }
}



// Create users
// function getUsers(): Promise<void> {
//   const request: RequestInfo = new Request('https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows?actor=arhanbusam', {
//     method: 'GET'
//   });

//   return fetch(request)
//     .then(response => response.json())
//     .then(data => {
//       data["follows"].forEach((user: { [x: string]: string; }) => {
//         let userObj = new User(user["did"], user["displayName"], []);
//         setUserArray([...userArray, userObj]);
//       });
//       return;
//     })
//     .catch(error => {
//       console.error('Error:', error);
//     });
  // for (let i = 0; i < 10; i++) {
  //     const id = Math.floor(Math.random() * 1000);
  //     const username = "Arhan Busam";
  //     userArray.push(new User(id, username, []));
  //   }

  //   userArray.forEach(user => {
  //     const followerCount = Math.floor(Math.random() * userArray.length);
  //     const followers: number[] = [];

  //     while (followers.length < followerCount) {
  //       const randomUser = userArray[Math.floor(Math.random() * userArray.length)];
  //       if (randomUser.id !== user.id && !followers.includes(randomUser.id)) {
  //         followers.push(randomUser.id);
  //       }
  //     }

  //     user.followers = followers;
  //   });
// }

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
}

// Define screen dimensions
// const screenWidth = window.innerWidth;
// const screenHeight = window.innerHeight;

// Create nodes with random positions
// let nodes: Node[] = userArray.map(user => ({
//   id: user.id,
//   label: user.username,
//   x: Math.random() * screenWidth,
//   y: Math.random() * screenHeight,
// }));

interface Link {
  source: string;
  target: string;
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const Graph: React.FC = () => {
  const [userArray, setUserArray] = useState<User[]>([]);

  const request: RequestInfo = new Request('https://public.api.bsky.app/xrpc/app.bsky.graph.getFollows?actor=arhanbusam.bsky.social', {
    method: 'GET'
  });

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(request)
      const data = await response.json()
      console.log(data);

      if (data && data["follows"]) {
        const newUsers = data["follows"].map((user: { [x: string]: string; }) => 
          new User(user["did"], user["displayName"], [])
        );
        setUserArray(prevArray => [...prevArray, ...newUsers]);
        console.log(newUsers);
      }
     
    };

    fetchData();
    return;
  }, []);
  
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
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [viewportDimensions, setViewportDimensions] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight
  }));

  // Add resize listener effect
  useEffect(() => {
    const handleResize = () => {
      setViewportDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add margin constant
  const VIEWPORT_MARGIN = 10;

  const getRandomViewportPosition = (transform: Transform) => {
    // Calculate visible viewport bounds in world coordinates with margins
    const viewportLeft = (-transform.x + VIEWPORT_MARGIN) / transform.scale;
    const viewportTop = (-transform.y + VIEWPORT_MARGIN) / transform.scale;
    const viewportWidth = (viewportDimensions.width - 2 * VIEWPORT_MARGIN) / transform.scale;
    const viewportHeight = (viewportDimensions.height - 2 * VIEWPORT_MARGIN) / transform.scale;

    // Generate random position within safe area
    return {
      x: viewportLeft + Math.random() * viewportWidth,
      y: viewportTop + Math.random() * viewportHeight
    };
  };

  // Replace the fixed coordinates in nodes initialization
  const [nodes, setNodes] = useState<Node[]>(userArray.map((user) => {
    const position = getRandomViewportPosition(transform);
    return {
      id: user.id,
      label: user.username,
      x: position.x,
      y: position.y,
    };
  }));

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
    const buffer = -100; // Add a buffer zone around viewport
    return nodes.some(node => {
      const transformedX = node.x * newTransform.scale + newTransform.x;
      const transformedY = node.y * newTransform.scale + newTransform.y;
      return transformedX >= -buffer && 
             transformedX <= viewportDimensions.width + buffer && 
             transformedY >= -buffer && 
             transformedY <= viewportDimensions.height + buffer;
    });
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>): void => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (viewportDimensions.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (viewportDimensions.height / rect.height);

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

  const handleMouseDown = (nodeId: string | null, e: React.MouseEvent<SVGElement>): void => {
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
      const dx = (e.movementX * 2000) / rect.width;
      const dy = (e.movementY * 2000) / rect.height;
      
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
        width={viewportDimensions.width}
        height={viewportDimensions.height}
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
                r={40 / transform.scale}
                fill="#3b82f6"
                stroke="#1d4ed8"
                strokeWidth={2 / transform.scale}
                onMouseDown={(e) => handleMouseDown(node.id, e)}
                className="cursor-pointer"
              />
              <foreignObject
                x={node.x - (40 / transform.scale)}
                y={node.y - (40 / transform.scale)}
                width={80 / transform.scale}
                height={80 / transform.scale}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: `${9 / transform.scale}px`,
                    textAlign: 'center',
                    wordWrap: 'break-word',
                    overflow: 'hidden'
                  }}
                >
                  {node.label}
                </div>
              </foreignObject>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

export default Graph;