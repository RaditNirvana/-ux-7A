"use client";

import { Children, isValidElement, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { usePathname } from "next/navigation";

function getNoticeKey(children: ReactNode): string {
  return Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (isValidElement<{ children?: ReactNode }>(child)) return getNoticeKey(child.props.children);
      return "";
    })
    .join("|");
}

export function TransientNotice({
  children,
  autoDismiss = true,
  className = "",
  duration = 4000,
  fadeDuration = 220,
  fadeEasing = "ease",
  onDismiss,
  role = "status",
  as = "div",
  style,
}: {
  children: ReactNode;
  autoDismiss?: boolean;
  className?: string;
  duration?: number;
  fadeDuration?: number;
  fadeEasing?: string;
  onDismiss?: () => void;
  role?: "alert" | "status";
  as?: "div" | "span";
  style?: CSSProperties;
}) {
  const pathname = usePathname();
  const contentKey = getNoticeKey(children);
  const [fadingKey, setFadingKey] = useState("");
  const [dismissedKey, setDismissedKey] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const hovered = useRef(false);
  const onDismissRef = useRef(onDismiss);
  const [initialPathname] = useState(pathname);
  const dismissRef = useRef<() => void>(() => {});
  const startTimerRef = useRef<() => void>(() => {});
  const fadingRef = useRef(false);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    const clearTimers = () => {
      if (timer.current) clearTimeout(timer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      timer.current = null;
      fadeTimer.current = null;
    };

    const dismiss = () => {
      if (fadingRef.current) return;
      fadingRef.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      setFadingKey(contentKey);
      fadeTimer.current = setTimeout(() => {
        setDismissedKey(contentKey);
        onDismissRef.current?.();
      }, fadeDuration);
    };

    const startTimer = () => {
      if (!autoDismiss || hovered.current || !contentKey) return;
      startedAt.current = Date.now();
      timer.current = setTimeout(dismiss, remaining.current);
    };

    dismissRef.current = dismiss;
    startTimerRef.current = startTimer;

    if (initialPathname !== pathname) {
      clearTimers();
      if (contentKey && dismissedKey !== contentKey) {
        fadeTimer.current = setTimeout(() => {
          setDismissedKey(contentKey);
          onDismissRef.current?.();
        }, 0);
      }
      return clearTimers;
    }

    if (!contentKey || dismissedKey === contentKey) {
      clearTimers();
      return clearTimers;
    }

    clearTimers();
    remaining.current = duration;
    hovered.current = false;
    fadingRef.current = false;
    if (autoDismiss) startTimer();

    return clearTimers;
  }, [autoDismiss, contentKey, dismissedKey, duration, fadeDuration, initialPathname, pathname]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
  }, []);

  if (!contentKey || dismissedKey === contentKey) return null;
  const fading = fadingKey === contentKey || initialPathname !== pathname;
  const NoticeElement = as;

  return (
    <NoticeElement
      aria-hidden={fading}
      className={className}
      onMouseEnter={() => {
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
          remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
        }
        hovered.current = true;
      }}
      onMouseLeave={() => {
        hovered.current = false;
        if (remaining.current <= 0) dismissRef.current();
        else startTimerRef.current();
      }}
      role={role}
      style={{ ...style, opacity: fading ? 0 : 1, transition: `opacity ${fadeDuration}ms ${fadeEasing}` }}
    >
      {children}
    </NoticeElement>
  );
}
