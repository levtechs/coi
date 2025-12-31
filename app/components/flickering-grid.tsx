'use client';

import React, { useEffect, useRef } from 'react';

export interface FlickeringGridProps {
    squareSize?: number;
    gridGap?: number;
    flickerChance?: number;
    color?: string;
    maxOpacity?: number;
    mouseRadius?: number;
    className?: string;
}

export const FlickeringGrid: React.FC<FlickeringGridProps> = ({
    squareSize = 4,
    gridGap = 6,
    flickerChance = 0.3,
    color = 'var(--neutral-500)',
    maxOpacity = 0.25,
    mouseRadius = 120,
    className,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const mouseRef = useRef({ x: -9999, y: -9999 });
    const squaresRef = useRef<Float32Array | null>(null);
    const gridRef = useRef({ cols: 0, rows: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrapper = wrapperRef.current;
        if (!canvas || !wrapper) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;

        /* ---------- resolve color ---------- */
        let resolvedColor = color;
        if (color.startsWith('var(')) {
            const prop = color.slice(4, -1);
            resolvedColor = getComputedStyle(document.documentElement)
                .getPropertyValue(prop)
                .trim();
        }

        const tmp = document.createElement('canvas');
        tmp.width = tmp.height = 1;
        const tctx = tmp.getContext('2d');
        if (!tctx) return;
        tctx.fillStyle = resolvedColor;
        tctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = tctx.getImageData(0, 0, 1, 1).data;
        const rgbaBase = `rgba(${r}, ${g}, ${b},`;

        /* ---------- resize ---------- */
        const resize = () => {
            const rect = wrapper.getBoundingClientRect();

            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;

            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const cols = Math.floor(rect.width / (squareSize + gridGap));
            const rows = Math.floor(rect.height / (squareSize + gridGap));

            gridRef.current = { cols, rows };
            squaresRef.current = new Float32Array(cols * rows);

            for (let i = 0; i < squaresRef.current.length; i++) {
                squaresRef.current[i] = Math.random() * maxOpacity;
            }
        };

        resize();
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(wrapper);

        /* ---------- mouse ---------- */
        const onMouseMove = (e: MouseEvent) => {
            mouseRef.current.x = e.clientX;
            mouseRef.current.y = e.clientY;
        };

        window.addEventListener('mousemove', onMouseMove);

        /* ---------- animation ---------- */
        let last = performance.now();
        let animationFrameId: number;

        const animate = (now: number) => {
            const dt = (now - last) / 1000;
            last = now;

            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

            const { cols, rows } = gridRef.current;
            const squares = squaresRef.current;
            if (!squares) {
                animationFrameId = requestAnimationFrame(animate);
                return;
            }

            for (let i = 0; i < squares.length; i++) {
                if (Math.random() < flickerChance * dt) {
                    squares[i] = Math.random() * maxOpacity;
                }
            }

            const mx = mouseRef.current.x;
            const my = mouseRef.current.y;

            for (let x = 0; x < cols; x++) {
                for (let y = 0; y < rows; y++) {
                    const idx = x * rows + y;

                    const px = x * (squareSize + gridGap) + squareSize / 2;
                    const py = y * (squareSize + gridGap) + squareSize / 2;

                    const dx = px - mx;
                    const dy = py - my;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    const boost = Math.exp(
                        -(dist * dist) / (mouseRadius * mouseRadius)
                    );

                    const opacity = Math.min(
                        maxOpacity,
                        squares[idx] + boost * maxOpacity
                    );

                    ctx.fillStyle = `${rgbaBase}${opacity})`;
                    ctx.fillRect(
                        x * (squareSize + gridGap),
                        y * (squareSize + gridGap),
                        squareSize,
                        squareSize
                    );
                }
            }

            animationFrameId = requestAnimationFrame(animate);
        };

        animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, [squareSize, gridGap, flickerChance, color, maxOpacity, mouseRadius]);

    return (
        <div
            ref={wrapperRef}
            className={`absolute inset-0 -z-10 ${className ?? ''}`}
        >
            <canvas
                ref={canvasRef}
                className="w-full h-full pointer-events-none"
            />
        </div>
    );
};
