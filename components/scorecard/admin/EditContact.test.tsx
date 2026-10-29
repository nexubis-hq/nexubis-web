import {
  createElement,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { ContactMenu } from "./EditContact";
import { saveAdminContact } from "@/app/audit/admin/contact-actions";

// Retain hook state across snapshots and invoke the actual button/action
// handlers. The details ref is a small stand-in for its browser DOM property.
const state = vi.hoisted(() => ({
  values: [] as unknown[],
  cursor: 0,
  menu: { open: true },
  toggle: undefined as undefined | (() => void),
  submit: undefined as undefined | ((form: FormData) => Promise<unknown>),
}));
vi.mock("react", async (original) => {
  const react = await original<typeof import("react")>();
  const useState = (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.values)) state.values[index] = initial;
    return [
      state.values[index],
      (next: unknown) => {
        state.values[index] = next;
      },
    ] as const;
  };
  return {
    ...react,
    useState,
    useRef: (initial: unknown) => {
      const index = state.cursor++;
      if (!(index in state.values)) state.values[index] = { current: initial };
      return state.values[index];
    },
    useEffect: () => {},
    useActionState: (
      action: (previous: unknown, form: FormData) => Promise<unknown>,
      initial: unknown
    ) => {
      const [previous, setPrevious] = useState(initial);
      return [
        previous,
        async (form: FormData) => {
          const result = await action(previous, form);
          setPrevious(result);
          return result;
        },
        false,
      ];
    },
  };
});
vi.mock("@/app/audit/admin/contact-actions", () => ({
  saveAdminContact: vi.fn(),
}));
beforeEach(() => {
  state.values = [];
  state.cursor = 0;
  state.menu = { open: true };
  state.toggle = undefined;
  state.submit = undefined;
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

function expand(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return node.map(expand);
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  if (typeof element.type === "function")
    return expand(
      (element.type as (props: unknown) => ReactNode)(element.props)
    );
  if (element.type === "details" && element.props.ref)
    (element.props.ref as { current: unknown }).current = state.menu;
  if (element.type === "button" && element.props.children === "Edit contact")
    state.toggle = element.props.onClick as () => void;
  if (element.type === "form")
    state.submit = element.props.action as (form: FormData) => Promise<unknown>;
  return cloneElement(element, {}, expand(element.props.children as ReactNode));
}
function render() {
  state.cursor = 0;
  return renderToStaticMarkup(
    expand(
      createElement(ContactMenu, {
        leadPath: "/audit/admin/example",
        firstName: "Peter-Paul",
        lastName: "Blom",
        role: "Director",
        children: createElement(
          "button",
          { className: "btn btn-secondary" },
          "Copy report link"
        ),
      })
    )
  );
}
it("C3 uses the same button class, toggles a prefilled form, and keeps errors open", async () => {
  const closed = render();
  expect(closed).toContain('class="btn btn-secondary" aria-expanded="false"');
  expect(closed).not.toContain("Save contact");
  state.toggle!();
  const opened = render();
  expect(opened).toContain('name="firstName" value="Peter-Paul"');
  expect(opened).toContain('name="lastName" value="Blom"');
  expect(opened).toContain('name="role" value="Director"');
  state.toggle!();
  expect(render()).not.toContain("Save contact");
  state.toggle!();
  render();
  vi.mocked(saveAdminContact).mockResolvedValue({
    message: "First name is required.",
    error: true,
  });
  await state.submit!(new FormData());
  const failed = render();
  expect(failed).toContain("First name is required.");
  expect(failed).toContain("Save contact");
  expect(state.menu.open).toBe(true);
});
it("C3 successful save closes the form and More menu, then dismisses the header message after three seconds", async () => {
  render();
  state.toggle!();
  render();
  vi.mocked(saveAdminContact).mockResolvedValue({ message: "Contact saved." });
  await state.submit!(new FormData());
  expect(state.menu.open).toBe(false);
  const saved = render();
  expect(saved).not.toContain("Save contact");
  expect(saved).toContain("Contact saved");
  await vi.advanceTimersByTimeAsync(2999);
  expect(render()).toContain("Contact saved");
  await vi.advanceTimersByTimeAsync(1);
  expect(render()).not.toContain("Contact saved");
});
