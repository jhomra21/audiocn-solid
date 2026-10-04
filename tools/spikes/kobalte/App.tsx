import * as ContextMenu from "@kobalte/core/context-menu";
import * as Popover from "@kobalte/core/popover";
import * as Select from "@kobalte/core/select";
import * as Slider from "@kobalte/core/slider";
import * as Switch from "@kobalte/core/switch";
import * as Tabs from "@kobalte/core/tabs";
import * as Tooltip from "@kobalte/core/tooltip";
import { createSignal } from "solid-js";

const options = ["One", "Two", "Three"];

export default function App() {
  const [sliderKey, setSliderKey] = createSignal("");
  const [sliderValue, setSliderValue] = createSignal(25);
  const [sliderRefReady, setSliderRefReady] = createSignal(false);

  return (
    <main class="spike-shell">
      <section>
        <h2>Slider</h2>
        <Slider.Root
          defaultValue={[25]}
          minValue={0}
          maxValue={100}
          step={5}
          onChange={(value) => setSliderValue(value[0] ?? Number.NaN)}
        >
          <Slider.Track class="slider-track" data-testid="slider-track">
            <Slider.Fill class="slider-fill" />
            <Slider.Thumb
              class="slider-thumb"
              data-testid="slider-thumb"
              ref={(element) => setSliderRefReady(element instanceof HTMLElement)}
              onKeyDown={(event) => setSliderKey(event.key)}
            >
              <Slider.Input />
            </Slider.Thumb>
          </Slider.Track>
        </Slider.Root>
        <output
          data-testid="slider-telemetry"
          data-key={sliderKey()}
          data-value={String(sliderValue())}
          data-ref-ready={String(sliderRefReady())}
        />
      </section>

      <section>
        <h2>Select</h2>
        <Select.Root
          options={options}
          placeholder="Choose"
          itemComponent={(props) => (
            <Select.Item item={props.item}>{props.item.rawValue}</Select.Item>
          )}
        >
          <Select.HiddenSelect />
          <Select.Trigger data-testid="select-trigger">
            <Select.Value<string>>
              {(state) => state.selectedOption()}
            </Select.Value>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content class="overlay" data-testid="select-content">
              <Select.Listbox />
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </section>

      <section>
        <h2>Popover</h2>
        <Popover.Root>
          <Popover.Trigger data-testid="popover-trigger">
            Open popover
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content class="overlay" data-testid="popover-content">
              <Popover.Title>Popover title</Popover.Title>
              <Popover.Description>Popover description</Popover.Description>
              <Popover.CloseButton>Close popover</Popover.CloseButton>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </section>

      <section>
        <h2>Switch</h2>
        <Switch.Root>
          <Switch.Input aria-label="Test switch" />
          <Switch.Control data-testid="switch-control">
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Root>
      </section>

      <section>
        <h2>Tabs</h2>
        <Tabs.Root defaultValue="one">
          <Tabs.List>
            <Tabs.Trigger value="one">One</Tabs.Trigger>
            <Tabs.Trigger value="two">Two</Tabs.Trigger>
            <Tabs.Trigger value="three">Three</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="one">Body one</Tabs.Content>
          <Tabs.Content value="two">Body two</Tabs.Content>
          <Tabs.Content value="three">Body three</Tabs.Content>
        </Tabs.Root>
      </section>

      <section>
        <h2>Tooltip</h2>
        <Tooltip.Root closeDelay={0} openDelay={0}>
          <Tooltip.Trigger data-testid="tooltip-trigger">
            Tooltip trigger
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Content class="overlay" data-testid="tooltip-content">
              Tooltip content
            </Tooltip.Content>
          </Tooltip.Portal>
        </Tooltip.Root>
      </section>

      <section>
        <h2>Context menu</h2>
        <ContextMenu.Root>
          <ContextMenu.Trigger class="context-target" data-testid="context-trigger">
            Context target
          </ContextMenu.Trigger>
          <ContextMenu.Portal>
            <ContextMenu.Content class="overlay" data-testid="context-content">
              <ContextMenu.Item>Menu action</ContextMenu.Item>
            </ContextMenu.Content>
          </ContextMenu.Portal>
        </ContextMenu.Root>
      </section>
    </main>
  );
}
