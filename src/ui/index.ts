// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Andrii Shylenko and kernelCAD contributors
//
// Shared UI primitives for Studio and the public pages. They use only the
// semantic tokens in src/index.css (bg-surface-1, text-fg-2, …), so they work
// in the light (vellum) and dark (workbench) themes. Set data-theme="dark" on
// a subtree for the dark values. Review them all at /ui-gallery.

export { Badge, type BadgeProps, type BadgeTone } from './Badge';
export { Button, type ButtonProps, type ButtonSize, type ButtonVariant } from './Button';
export { buttonClass, buttonLook } from './buttonStyles';
export { contrastRatio, relativeLuminance, AA_TEXT, AA_LARGE_OR_UI } from './contrast';
export { cx } from './cx';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, type ErrorStateProps } from './ErrorState';
export { IconButton, type IconButtonProps, type IconButtonSize } from './IconButton';
export { Kbd, type KbdProps } from './Kbd';
export { keyLabel } from './keys';
export { Menu, type MenuAction, type MenuEntry, type MenuProps, type MenuSeparator, type MenuTriggerProps } from './Menu';
export { NumberInput, type NumberInputProps } from './NumberInput';
export { Panel, type Elevation, type PanelProps } from './Panel';
export { Sheet, type SheetProps } from './Sheet';
export { Skeleton, SkeletonCard, SkeletonList, SkeletonText } from './Skeleton';
export { Slider, type SliderProps } from './Slider';
export { SliderField, type SliderFieldProps } from './SliderField';
export { TabPanel, Tabs, type TabPanelProps, type TabsProps } from './Tabs';
export { type TabItem } from './tabsModel';
export { themeOf, type Theme } from './theme';
export { ToastProvider } from './Toast';
export { useToast, type ToastApi } from './toastContext';
export { type ToastInput, type ToastTone } from './toastModel';
export { Tooltip, type TooltipProps, type TooltipSide } from './Tooltip';
export { useFocusTrap } from './useFocusTrap';
