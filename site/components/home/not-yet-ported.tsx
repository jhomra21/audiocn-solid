interface NotYetPortedProps {
  item: string;
}

export const NotYetPorted = (props: NotYetPortedProps) => (
  <div
    class="text-muted-foreground flex min-h-28 w-full items-center justify-center rounded-lg border border-dashed px-4 text-center text-xs"
    data-not-yet-ported={props.item}
  >
    {props.item} is not ported yet.
  </div>
);
