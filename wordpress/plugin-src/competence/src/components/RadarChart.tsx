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

// Register required Chart.js components
Chart.register(
  RadialLinearScale,
  RadarController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

// Props definition
interface RadarChartProps {
  chartData: {
    labels: string[];  // Axis labels
    data: number[];    // Corresponding data points
  };
}

const RadarChart: React.FC<RadarChartProps> = ({ chartData }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    const ctx = chartRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Clean up old chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Initialize radar chart
    chartInstanceRef.current = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: 'Progression',
            data: chartData.data,
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 1,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
              callback: (value: string | number) => {
                const labels = ['', '+', '++', '+++'];
                const index = typeof value === 'number' ? value : parseInt(value, 10);
                return labels[index] || '';
              },
              font: {
                size: 7
              }
            }
          }
        }
      }
    });

    // Clean up on unmount
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
      <canvas ref={chartRef} width={728} height={300} />
    </div>
  );
};

export default RadarChart;
