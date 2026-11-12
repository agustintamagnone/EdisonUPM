import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export function IconSearch({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <circle cx="7.2" cy="7.2" r="4.7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.7 10.7L13.8 13.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function IconBell({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path
        d="M13.5 6.75C13.5 4.26472 11.4853 2.25 9 2.25C6.51472 2.25 4.5 4.26472 4.5 6.75C4.5 12 2.25 13.5 2.25 13.5H15.75C15.75 13.5 13.5 12 13.5 6.75Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.3 15.75C9.99686 16.2712 9.44012 16.5919 8.838 16.5919C8.23588 16.5919 7.67914 16.2712 7.376 15.75"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPlus({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M8 3.2V12.8M3.2 8H12.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconBookmark({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 2.5H12C12.5523 2.5 13 2.94772 13 3.5V13.8L8 10.7L3 13.8V3.5C3 2.94772 3.44772 2.5 4 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMessage({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.5 4.2C2.5 3.26112 3.26112 2.5 4.2 2.5H11.8C12.7389 2.5 13.5 3.26112 13.5 4.2V9.8C13.5 10.7389 12.7389 11.5 11.8 11.5H6L2.5 14V4.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconThumbsUp({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M5.2 7.2L7.5 2.5C8.1 2.5 8.8 3 8.8 3.9L8.5 6.2H12.3C13.1 6.2 13.7 6.9 13.5 7.7L12.5 12.5C12.3 13.1 11.8 13.5 11.2 13.5H5.2M5.2 7.2V13.5M5.2 7.2H2.8C2.4 7.2 2 7.5 2 8V12.7C2 13.1 2.4 13.5 2.8 13.5H5.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconArrowLeft({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M12.8 8H3.2M3.2 8L7.2 4M3.2 8L7.2 12"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCheck({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M3.2 8.3L6.4 11.5L12.8 4.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconExternal({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.5 3.5H3.8C3.08203 3.5 2.5 4.08203 2.5 4.8V12.2C2.5 12.918 3.08203 13.5 3.8 13.5H11.2C11.918 13.5 12.5 12.918 12.5 12.2V9.5M9.5 2.5H13.5M13.5 2.5V6.5M13.5 2.5L7.5 8.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconUpload({ className = '', size = 22 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 16V4M12 4L7.5 8.5M12 4L16.5 8.5M4 17V18.5C4 19.6046 4.89543 20.5 6 20.5H18C19.1046 20.5 20 19.6046 20 18.5V17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLink({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.8 9.2C7.5 9.9 8.6 9.9 9.3 9.2L12.1 6.4C12.8 5.7 12.8 4.6 12.1 3.9C11.4 3.2 10.3 3.2 9.6 3.9L8.4 5.1M9.2 6.8C8.5 6.1 7.4 6.1 6.7 6.8L3.9 9.6C3.2 10.3 3.2 11.4 3.9 12.1C4.6 12.8 5.7 12.8 6.4 12.1L7.6 10.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSparkle({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 1.5L9.4 6.1L14 7.5L9.4 8.9L8 13.5L6.6 8.9L2 7.5L6.6 6.1L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconBulb({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <path
        d="M6.75 13.5H11.25M7.5 16H10.5M9 2.25C6.1 2.25 3.75 4.6 3.75 7.5C3.75 9.4 4.8 11.1 6.3 12V13.5H11.7V12C13.2 11.1 14.25 9.4 14.25 7.5C14.25 4.6 11.9 2.25 9 2.25Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconEye({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path
        d="M1.5 8C2.8 4.8 5.2 3.2 8 3.2C10.8 3.2 13.2 4.8 14.5 8C13.2 11.2 10.8 12.8 8 12.8C5.2 12.8 2.8 11.2 1.5 8Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconClose({ className = '', size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconChevDown({ className = '', size = 14 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className} aria-hidden="true">
      <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGlobe({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="9" r="6.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.25 9H15.75M9 2.25C10.8 4.2 11.7 6.6 11.7 9C11.7 11.4 10.8 13.8 9 15.75C7.2 13.8 6.3 11.4 6.3 9C6.3 6.6 7.2 4.2 9 2.25Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function IconLock({ className = '', size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none" className={className} aria-hidden="true">
      <rect x="3.75" y="8.25" width="10.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 8.25V5.5C6 3.84315 7.34315 2.5 9 2.5C10.6569 2.5 12 3.84315 12 5.5V8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
