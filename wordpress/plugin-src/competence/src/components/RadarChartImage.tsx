'use client';

import React, { useEffect, useRef } from 'react';
import {
  Chart,
  RadialLinearScale,
  RadarController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

// Chart.js setup
Chart.register(
  RadialLinearScale,
  RadarController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

// Props
interface RadarChartImageProps {
  chartData: {
    labels: string[];
    data: number[];
    labelImages: string[]; // base64 strings or image URLs
  };
}

const RadarChartImage: React.FC<RadarChartImageProps> = ({ chartData }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const labelEmpty = new Array(chartData.labels.length).fill('');

  const formatText = (text: string, width: number): string => {
    if (text.length > width) {
      return text.slice(text.length - width);
    }
    return ' '.repeat(width - text.length) + text;
  };

  useEffect(() => {
    const ctx = chartRef.current?.getContext('2d');
    if (!ctx) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const labelImages: HTMLImageElement[] = chartData.labelImages.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });

    Promise.all(
      labelImages.map(
        (img) =>
          new Promise<HTMLImageElement | null>((resolve) => {
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
          })
      )
    ).then((loadedImages) => {
      chartInstanceRef.current = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: labelEmpty,
          datasets: [
            {
              label: 'Progression',
              data: chartData.data,
              backgroundColor: 'rgba(54, 162, 235, 0.2)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: {
            padding: {
              top: 40,
              bottom: 40,
              left: 120,
              right: 120
            }
          },
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            r: {
              min: 0,
              max: 3,
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                callback: (value) => {
                  const labels = ['', '+', '++', '+++'];
                  const index = typeof value === 'number' ? value : parseInt(value as string, 10);
                  return labels[index] || '';
                },
                font: {
                  size: 7
                }
              }
            }
          },
          animation: {
            onComplete: () => {
              const chart = chartInstanceRef.current;
              if (!chart) return;

              const { width, height, top, left } = chart.chartArea;
              const centerX = width / 2 + left;
              const centerY = height / 2 + top;
              const radius = Math.min(width, height) / 2;
              const count = chartData.labels.length;

              for (let i = 0; i < count; i++) {
                const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
                const x = centerX + radius * Math.cos(angle);
                const y = centerY + radius * Math.sin(angle);

                const img = loadedImages[i];
                if (img) {
                  ctx.drawImage(img, x - 15, y - 30, 30, 30);
                } else {
                  ctx.fillStyle = '#ccc';
                  ctx.fillRect(x - 15, y - 30, 30, 30);
                }

                ctx.font = 'bold 8px Verdana';
                ctx.fillStyle = '#000';
                if (Math.cos(angle) > 0) {
                  ctx.fillText(chartData.labels[i], x, y - 30);
                } else {
                  ctx.fillText(formatText(chartData.labels[i], 50), x - 120, y - 30);
                }
              }
            }
          }
        }
      });
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [chartData]);

  return (
    <div
      style={{
        height: '12cm',
        width: '100%',
        overflow: 'hidden'
      }}
    >
      <canvas ref={chartRef} width={728} height={454} />
    </div>
  );
};

export default RadarChartImage;
