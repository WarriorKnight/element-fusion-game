import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphProps {
  // Update the node interface to include an optional image URL
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
      fgRef.current.d3Force('charge').strength(-400);
      fgRef.current.d3Force('link').distance(500);
      
      // Add timeout to ensure graph has time to layout before zooming
      setTimeout(() => {
        fgRef.current.zoomToFit(800, 100);
      }, 300);
    }
  }, [nodes, links]);

return (
  <div className='bg-opacity-50 rounded-lg p-4 shadow-lg'>
    <ForceGraph2D
      ref={fgRef}
      graphData={{ nodes, links }}
      nodeAutoColorBy="id"
      linkDirectionalArrowLength={6}
      linkDirectionalArrowRelPos={0.7}
      linkDirectionalArrowColor={'#FFFFFF'}
      linkWidth={2}
      linkColor={'#ffffff'}
      backgroundColor="rgba(59, 29, 29, 0.6)" // Make the canvas background transparent
      nodeCanvasObject={(node: any, ctx, globalScale) => {
        // Draw image if available, otherwise fall back to circle
        if (node.imgUrl && nodeImages[node.id] && nodeImages[node.id].complete) {
          const size = 60 / globalScale;
          const img = nodeImages[node.id];
          ctx.drawImage(img, node.x - size/2, node.y - size/2, size, size);
        } else {
          // Fallback to circle
          ctx.fillStyle = node.color || 'lightblue';
          ctx.beginPath();
          ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      }}
      width={600}
      height={600}
    />
  </div>
);