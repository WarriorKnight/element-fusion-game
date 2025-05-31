import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';

// Dynamically import the 2D force-directed graph component; SSR is disabled for this component.
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

/**
 * GraphProps interface defines the structure of the graph data.
 * @property {Array} nodes - List of node objects containing id, name, and optionally an image URL.
 * @property {Array} links - List of link objects specifying relationships with source and target node ids.
 */
interface GraphProps {
  nodes: { id: string; name: string; imgUrl?: string }[];
  links: { source: string; target: string }[];
}

/**
 * GraphComponent renders a 2D force-directed graph using the ForceGraph2D library.
 *
 * It preloads node images, configures graph forces (charge and link distance),
 * and sets up custom canvas rendering for nodes and links.
 *
 * @param {GraphProps} props - The graph data containing nodes and links.
 * @returns {JSX.Element} The rendered graph component.
 */
export default function GraphComponent({ nodes, links }: GraphProps) {
  // Reference to the ForceGraph2D component methods.
  const fgRef = useRef<import('react-force-graph-2d').ForceGraphMethods | undefined>(undefined);
  // State to store preloaded images keyed by node id.
  const [nodeImages, setNodeImages] = useState<Record<string, HTMLImageElement>>({});

  // Preload images for every node that has an image URL.
  useEffect(() => {
    const images: Record<string, HTMLImageElement> = {};
    
    nodes.forEach(node => {
      if (node.imgUrl) {
        const img = new Image();
        img.src = node.imgUrl;
        images[node.id] = img;
      }
    });
    
    setNodeImages(images);
  }, [nodes]);

  // Configure graph parameters and animate zoom-to-fit after layout.
  useEffect(() => {
    if (fgRef.current) {
      // Increase repulsion between nodes.
      fgRef.current.d3Force('charge')?.strength(-4000);
      // Set link distance between nodes.
      fgRef.current.d3Force('link')?.distance(60);
      
      // Add timeout to ensure graph has time to layout before zooming.
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(800, 100);
        }
      }, 300);
    }
  }, [nodes, links]);

  return (
    <div className='bg-opacity-50 rounded-lg center flex items-center justify-center'>
      <ForceGraph2D
        ref={fgRef}
        graphData={{ nodes, links }}
        nodeAutoColorBy="id"
        nodeRelSize={10}               // Increased from default (useful for base hit area)
        linkDirectionalArrowLength={20}
        linkDirectionalArrowRelPos={0.7}
        linkDirectionalArrowColor={() => "#FFFFFF"}
        linkWidth={1}
        linkColor={() => "#FFFFFF"}
        backgroundColor="rgba(23, 34, 136, 0)"
        // Custom link rendering for arrows.
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: import('react-force-graph-2d').LinkObject, ctx) => {
          // Draw custom white arrows on link paths.
          const start = link.source as { x: number; y: number };
          const end = link.target as { x: number; y: number };
          
          // Calculate direction angle for arrow rendering.
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const angle = Math.atan2(dy, dx);

          // Arrow parameters.
          const arrowLength = 10;
          const arrowPos = 0.7; // 70% along the line.
          
          // Calculate arrow tip position.
          const arrowX = start.x + dx * arrowPos;
          const arrowY = start.y + dy * arrowPos;
          
          // Draw arrow shape.
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle - Math.PI / 7),
            arrowY - arrowLength * Math.sin(angle - Math.PI / 7)
          );
          ctx.lineTo(
            arrowX - arrowLength * Math.cos(angle + Math.PI / 7),
            arrowY - arrowLength * Math.sin(angle + Math.PI / 7)
          );
          ctx.closePath();
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
        }}
        // Custom node rendering on canvas.
        nodeCanvasObject={(node: any, ctx, globalScale) => { // eslint-disable-line
          // Draw a larger transparent hit area for better touch interaction.
          const hitAreaSize = 40 / globalScale;
          ctx.beginPath();
          ctx.arc(node.x, node.y, hitAreaSize, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(255, 255, 255, 0.01)";  // Nearly invisible but still clickable.
          ctx.fill();
          
          // If an image exists and is loaded, render the image.
          if (node.imgUrl && nodeImages[node.id] && nodeImages[node.id].complete) {
            const size = 60 / globalScale;
            const img = nodeImages[node.id];
            ctx.drawImage(img, node.x - size/2, node.y - size/2, size, size);
            
            // Add a white border around the image for better visibility.
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.beginPath();
            //ctx.arc(node.x, node.y, size/2, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Render node name label below the image.
            ctx.font = `${12/globalScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(node.name, node.x, node.y + (size/2) + (14/globalScale));
          } else {
            // Fallback to a white circle if no image is present.
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Render node name label below the circle.
            ctx.font = `${12/globalScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(node.name, node.x, node.y + 16/globalScale);
          }
        }}
        width={900}
        height={700}
      />
    </div>
  );
}