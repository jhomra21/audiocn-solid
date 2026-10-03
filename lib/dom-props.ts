export type DataAttributes = {
  [Key in `data-${string}`]?: string | number | boolean | undefined;
};

export type AriaAttributes = {
  [Key in `aria-${string}`]?: string | number | boolean | undefined;
};

export type AriaRole =
  | "button"
  | "meter"
  | "none"
  | "presentation"
  | "progressbar"
  | "status";

export type GlobalDOMProps = DataAttributes &
  AriaAttributes & {
    id?: string;
    role?: AriaRole;
    title?: string;
    hidden?: boolean;
    tabIndex?: number;
    dir?: "ltr" | "rtl" | "auto";
    lang?: string;
  };

export type ButtonDOMProps = GlobalDOMProps & {
  disabled?: boolean;
  form?: string;
  name?: string;
  value?: string;
};

export type SvgDOMProps = DataAttributes &
  AriaAttributes & {
    class?: string;
    className?: string;
    fill?: string;
    height?: string | number;
    role?: AriaRole;
    viewBox?: string;
    width?: string | number;
    xmlns?: string;
  };
