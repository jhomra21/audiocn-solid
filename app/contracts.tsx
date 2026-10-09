import * as SelectPrimitive from "@kobalte/core/select";
import { createSignal } from "solid-js";

import { ClipIndicator } from "@/components/ui/clip-indicator";
import type {
  ClipIndicatorActions,
  ClipIndicatorClickEvent,
} from "@/components/ui/clip-indicator";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { DbReadout } from "@/components/ui/db-readout";
import { DbScale, DbScaleTick } from "@/components/ui/db-scale";
import {
  LevelMeter,
  LevelMeterBar,
  LevelMeterChannel,
  LevelMeterChannels,
  LevelMeterHold,
  LevelMeterTrack,
  LevelMeterValue,
} from "@/components/ui/level-meter";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectLabel,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "@/components/ui/select";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { createFrameEmitter } from "@/lib/audio/frame-source";
import type { MeterFrame } from "@/lib/audio/types";

const ReadoutSwitch = () => {
  const source = createFrameEmitter<MeterFrame>();
  const [mode, setMode] = createSignal<"source" | "value">("source");

  return (
    <section data-contract="readout-switch">
      <DbReadout
        holdMs={Number.POSITIVE_INFINITY}
        intervalMs={25}
        source={mode() === "source" ? source : null}
        value={mode() === "value" ? -6 : undefined}
      />
      <button
        data-testid="emit-readout"
        onClick={() => source.emit({ channels: [{ peakDb: -12 }] })}
        type="button"
      >
        Emit
      </button>
      <button
        data-testid="use-value"
        onClick={() => setMode("value")}
        type="button"
      >
        Value
      </button>
      <button
        data-testid="use-source"
        onClick={() => setMode("source")}
        type="button"
      >
        Source
      </button>
    </section>
  );
};

const PreventedClip = () => {
  let actions: ClipIndicatorActions | null = null;

  return (
    <section data-contract="prevented-clip">
      <ClipIndicator
        actionsRef={(next) => {
          actions = next;
        }}
        holdMs={Number.POSITIVE_INFINITY}
        onClick={(event: ClipIndicatorClickEvent) =>
          event.preventBaseUIHandler()
        }
        showCount
      />
      <button
        data-testid="report-clip"
        onClick={() => actions?.report(0)}
        type="button"
      >
        Report
      </button>
    </section>
  );
};

export const SupportContractApp = () => {
  const [checked, setChecked] = createSignal(false);
  const [route, setRoute] = createSignal("mono");

  const options = Array.from(
    { length: 30 },
    (_, index) => `Device ${index + 1}`
  );

  return (
    <section class="grid gap-4 p-6" data-contract="support-compounds">
      <ContextMenu>
        <ContextMenuTrigger as="button" data-testid="support-menu-trigger">
          Routing menu
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuCheckboxItem checked={checked()} onChange={setChecked}>
            Monitor
          </ContextMenuCheckboxItem>
          <ContextMenuCheckboxItem disabled>
            Unavailable
          </ContextMenuCheckboxItem>
          <ContextMenuItem>
            Reset <ContextMenuShortcut>⌘R</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive">
            Delete <ContextMenuShortcut>⌘D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>Routing</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup value={route()} onValueChange={setRoute}>
                <ContextMenuRadioItem value="mono">Mono</ContextMenuRadioItem>
                <ContextMenuRadioItem value="stereo">
                  Stereo
                </ContextMenuRadioItem>
              </ContextMenuRadioGroup>
              <ContextMenuSeparator />
              <ContextMenuItem variant="destructive">
                Delete route <ContextMenuShortcut>⌘D</ContextMenuShortcut>
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
      <Select
        options={options}
        defaultValue={options[0]}
        itemComponent={(props) => (
          <SelectItem item={props.item}>
            <SelectPrimitive.ItemLabel>
              {props.item.rawValue}
            </SelectPrimitive.ItemLabel>
          </SelectItem>
        )}
      >
        <SelectTrigger aria-label="Support select">
          <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectLabel>Devices</SelectLabel>
          <SelectScrollUpButton />
          <SelectPrimitive.Listbox class="max-h-40!" />
          <SelectScrollDownButton />
        </SelectContent>
      </Select>
    </section>
  );
};

export const ContractApp = () => {
  const reducedMotion = useReducedMotion();

  return (
    <main data-runtime-contracts>
      <section data-contract="value-floor">
        <LevelMeter peakDb={-50}>
          <LevelMeterValue floorDb={-40} />
        </LevelMeter>
      </section>

      <section data-contract="readout-overrides">
        <DbReadout
          data-slot="custom-readout"
          data-zone="mine"
          role="status"
          value={-6}
        />
      </section>

      <section data-contract="value-class">
        <LevelMeter peakDb={-20}>
          <LevelMeterValue class="text-sm" />
        </LevelMeter>
      </section>

      <section data-contract="scale-style">
        <DbScale>
          <DbScaleTick style="color: red" value={-6} />
        </DbScale>
      </section>

      <section data-contract="ignored-children">
        <LevelMeter peakDb={-20}>
          <LevelMeterChannels>
            <LevelMeterChannel>
              <LevelMeterTrack>
                <LevelMeterBar>BAR-CHILD</LevelMeterBar>
                <LevelMeterHold class="hold-x">HOLD-CHILD</LevelMeterHold>
              </LevelMeterTrack>
            </LevelMeterChannel>
          </LevelMeterChannels>
        </LevelMeter>
      </section>

      <section data-contract="meter-overrides">
        <LevelMeter
          aria-valuemin={-100}
          data-slot="custom-meter"
          peakDb={-20}
          role="progressbar"
        />
      </section>

      <PreventedClip />

      <section data-contract="custom-render">
        <ClipIndicator
          data-extra="forwarded"
          title="Custom clip"
          render={(renderProps, state) => {
            const { children, ...buttonProps } = renderProps;

            return (
              <button
                {...buttonProps}
                data-render-state={state.clipping ? "clip" : "idle"}
              >
                {children}
              </button>
            );
          }}
        />
      </section>

      <ReadoutSwitch />

      <span data-testid="reduced-motion">
        {reducedMotion() ? "reduce" : "no-preference"}
      </span>
    </main>
  );
};
