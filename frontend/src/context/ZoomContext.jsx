import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { TransformWrapper, TransformComponent, useTransformContext } from 'react-zoom-pan-pinch';

// ─── Context chỉ lưu ref đến API của TransformWrapper ────────────────────────
const ZoomContext = createContext(null);

export const useZoom = () => useContext(ZoomContext);

// ─── ZoomProvider: chỉ cung cấp context, KHÔNG bọc TransformWrapper ──────────
// TransformWrapper và TransformComponent phải nằm cùng nhau trong ZoomableContent
export const ZoomProvider = ({ children }) => {
  const apiRef = useRef({
    zoomIn:         () => {},
    zoomOut:        () => {},
    resetTransform: () => {},
    zoomToElement:  () => {},
  });
  const [scale, setScale] = useState(1);

  const value = useMemo(
    () => ({
      apiRef,
      scale,
      setScale,
    }),
    [scale]
  );

  return (
    <ZoomContext.Provider value={value}>
      {children}
    </ZoomContext.Provider>
  );
};

// ─── Nội bộ: lấy API từ TransformWrapper và ghi vào ref ─────────────────────
const ZoomApiSync = () => {
  const transformCtx = useTransformContext();
  const zoom = useZoom();

  useEffect(() => {
    if (!zoom || !transformCtx) return;
    zoom.apiRef.current = {
      zoomIn:         transformCtx.zoomIn,
      zoomOut:        transformCtx.zoomOut,
      resetTransform: transformCtx.resetTransform,
      zoomToElement:  transformCtx.zoomToElement,
      instance:       transformCtx.instance,
    };
  }, [zoom, transformCtx]);

  const currentScale = transformCtx?.instance?.transformState?.scale ?? 1;

  useEffect(() => {
    if (!zoom) return;
    zoom.setScale(currentScale);
  }, [zoom, currentScale]);

  return null;
};

// ─── ZoomableContent: TransformWrapper + TransformComponent luôn cùng nhau ───
export const ZoomableContent = ({ children }) => {
  return (
    <div className="ie-zoom-root">
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={20}
        limitToBounds={true}
        centerOnInit={true}
        wheel={{ step: 0.1 }}
        doubleClick={{ mode: 'zoomIn', step: 0.7 }}
        panning={{ velocityDisabled: false }}
      >
        {/* Đồng bộ API vào ZoomContext */}
        <ZoomApiSync />

        <TransformComponent
          wrapperClass="ie-zoom-wrapper"
          contentClass="ie-zoom-content"
          wrapperStyle={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
          }}
          contentStyle={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {children}
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};
