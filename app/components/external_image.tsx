"use client";

import React from "react";

/**
 * Renders a native {@link HTMLImageElement} for URLs from arbitrary hosts (favicons,
 * scraped reference images, uploads). Prefer `next/image` only when origins are known
 * and listed under `images.remotePatterns` in `next.config.ts`.
 */
export default function ExternalImage({
  loading = "lazy",
  decoding = "async",
  alt = "",
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external URLs; see module comment
    <img loading={loading} decoding={decoding} alt={alt} {...props} />
  );
}
