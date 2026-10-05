import type { JSX } from "@solidjs/web/jsx-runtime";

export type ButtonDOMProps = JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export type DivDOMProps = JSX.HTMLAttributes<HTMLDivElement>;

export type CanvasDOMProps = JSX.IntrinsicElements["canvas"];

export type GroupDOMProps = JSX.IntrinsicElements["g"];

export type HeadingDOMProps = JSX.HTMLAttributes<HTMLHeadingElement>;

export type InputDOMProps = JSX.InputHTMLAttributes<HTMLInputElement>;

export type LineDOMProps = JSX.IntrinsicElements["line"];

export type ParagraphDOMProps = JSX.HTMLAttributes<HTMLParagraphElement>;

export type PathDOMProps = JSX.IntrinsicElements["path"];

export type SpanDOMProps = JSX.HTMLAttributes<HTMLSpanElement>;

export type SvgDOMProps = JSX.SvgSVGAttributes<SVGSVGElement>;

export type JSXElement = JSX.Element;
