import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ImageLayoutSlot, ImageShape } from "@/types/book";

interface TemplateImageProps {
  imageUrl: string;
  alt: string;
  layout: ImageLayoutSlot;
  children?: React.ReactNode; // text content to wrap around
}

const shapeClipPaths: Partial<Record<ImageShape, string>> = {
  hexagon: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
  triangle: "polygon(50% 0%, 100% 100%, 0% 100%)",
};

const shapeClasses: Record<ImageShape, string> = {
  square: "rounded-md",
  rectangle: "rounded-md",
  circle: "rounded-full",
  hexagon: "",
  triangle: "",
  "rounded-rect": "rounded-2xl",
};

const sizeStyles: Record<string, { width: string; height: string }> = {
  small: { width: "180px", height: "180px" },
  medium: { width: "280px", height: "240px" },
  large: { width: "100%", height: "320px" },
};

const sizeMobileStyles: Record<string, { width: string; height: string }> = {
  small: { width: "120px", height: "120px" },
  medium: { width: "200px", height: "170px" },
  large: { width: "100%", height: "220px" },
};

export function TemplateImage({ imageUrl, alt, layout, children }: TemplateImageProps) {
  const { shape, position, size, wrapText } = layout;
  const clipPath = shapeClipPaths[shape];
  const borderClass = shapeClasses[shape];
  const dims = sizeStyles[size];
  const mobileDims = sizeMobileStyles[size];

  const imageElement = (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "overflow-hidden shadow-lg",
        borderClass,
        position === "full-width" || position === "center" ? "mx-auto" : "",
      )}
      style={{
        width: position === "full-width" ? "100%" : undefined,
        maxWidth: position === "full-width" ? "100%" : dims.width,
        height: dims.height,
        clipPath: clipPath || undefined,
        ...(shape === "circle" ? { width: dims.height, height: dims.height } : {}),
      }}
    >
      <img
        src={imageUrl}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </motion.div>
  );

  // Full-width or center: image on its own line
  if (position === "full-width" || position === "center" || !wrapText) {
    return (
      <div className="mb-6">
        {imageElement}
        {children && <div className="mt-4">{children}</div>}
      </div>
    );
  }

  // Text wrapping using float
  const isLeft = position === "left";
  const floatStyle: React.CSSProperties = {
    float: isLeft ? "left" : "right",
    maxWidth: dims.width,
    [isLeft ? "marginRight" : "marginLeft"]: "1.25rem",
    marginBottom: "1rem",
    ...(shape === "circle" ? { width: mobileDims.height, height: mobileDims.height, shapeOutside: "circle(50%)" } : {}),
    ...(clipPath ? { shapeOutside: clipPath } : {}),
  };

  return (
    <div className="clearfix">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn("overflow-hidden shadow-lg", borderClass)}
        style={{
          ...floatStyle,
          height: dims.height,
          clipPath: clipPath || undefined,
        }}
      >
        <img
          src={imageUrl}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </motion.div>
      {children}
      <div style={{ clear: "both" }} />
    </div>
  );
}
