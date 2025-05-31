import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphProps {
  nodes: { id: string; name: string; imgUrl?: string }[];
  links: { source: string; target: string }[];
}

export default function GraphComponent({ nodes, links }: GraphProps) {
  const fgRef = useRef<any>();
  const [nodeImages, setNodeImages] = useState<Record<string, HTMLImageElement>>({});

  // Preload images
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

  useEffect(() => {
    if (fgRef.current) {
      // Increase repulsion between nodes
      fgRef.current.d3Force('charge').strength(-4000);
      fgRef.current.d3Force('link').distance(60);
      
      // Add timeout to ensure graph has time to layout before zooming
      setTimeout(() => {
        fgRef.current.zoomToFit(800, 100);
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
        // Custom link rendering for arrows
        linkCanvasObjectMode={() => "after"}
        linkCanvasObject={(link: any, ctx) => {
          // Draw custom white arrows
          const start = link.source;
          const end = link.target;
          
          // Calculate arrow position
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const angle = Math.atan2(dy, dx);
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          // Arrow parameters
          const arrowLength = 10;
          const arrowPos = 0.7; // 70% along the line
          
          // Calculate arrow tip position
          const arrowX = start.x + dx * arrowPos;
          const arrowY = start.y + dy * arrowPos;
          
          // Draw arrow
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
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          // First draw a larger transparent hit area for better touch interaction
          const hitAreaSize = 40 / globalScale;
          ctx.beginPath();
          ctx.arc(node.x, node.y, hitAreaSize, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(255, 255, 255, 0.01)";  // Nearly invisible but still clickable
          ctx.fill();
          
          // Draw image if available, otherwise fall back to white circle
          if (node.imgUrl && nodeImages[node.id] && nodeImages[node.id].complete) {
            const size = 60 / globalScale;
            const img = nodeImages[node.id];
            ctx.drawImage(img, node.x - size/2, node.y - size/2, size, size);
            
            // Add white border around images for better visibility
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.beginPath();
            //ctx.arc(node.x, node.y, size/2, 0, 2 * Math.PI);
            ctx.stroke();
            
            // Add node name label below the image
            ctx.font = `${12/globalScale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(node.name, node.x, node.y + (size/2) + (14/globalScale));
          } else {
            // Fallback to white circle with explicit styling
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
            ctx.fill();
            
            // Add node name label below the circle
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