export type DataAttributes = {
  [Key in `data-${string}`]?: string | number | boolean | undefined;
};

export type AriaAttributes = {
  [Key in `aria-${string}`]?: string | number | boolean | undefined;
};

export type GlobalDOMProps = DataAttributes &
  AriaAttributes & {
    id?: string;
    role?: string;
    title?: string;
    hidden?: boolean;
    tabIndex?: number;
    dir?: "ltr" | "rtl" | "auto";
    lang?: string;
    draggable?: boolean;
    onBlur?: (event: FocusEvent) => void;
    onClick?: (event: MouseEvent) => void;
    onDoubleClick?: (event: MouseEvent) => void;
    onFocus?: (event: FocusEvent) => void;
    onKeyDown?: (event: KeyboardEvent) => void;
    onKeyUp?: (event: KeyboardEvent) => void;
    onMouseDown?: (event: MouseEvent) => void;
    onMouseEnter?: (event: MouseEvent) => void;
    onMouseLeave?: (event: MouseEvent) => void;
    onMouseUp?: (event: MouseEvent) => void;
    onPointerDown?: (event: PointerEvent) => void;
    onPointerUp?: (event: PointerEvent) => void;
  };

export type ButtonDOMProps = GlobalDOMProps & {
  disabled?: boolean;
  form?: string;
  name?: string;
  value?: string | number;
};

export type SvgDOMProps = DataAttributes &
  AriaAttributes & {
    class?: string;
    className?: string;
    fill?: string;
    height?: string | number;
    role?: string;
    viewBox?: string;
    width?: string | number;
    xmlns?: string;
  };
