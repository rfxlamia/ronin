# Ronin Observer D-Bus Interface Specification

This document defines the D-Bus interface for the Ronin Observer GNOME Shell Extension.

## Overview

The GNOME Shell Extension acts as a bridge between the Wayland compositor and the Ronin Observer daemon. Since Wayland doesn't allow direct window title access from unprivileged applications, a GNOME Shell Extension is required to capture window focus events and relay them via D-Bus.

## Interface Definition

### Service Name
```
org.ronin.Observer
```

### Object Path
```
/org/ronin/Observer
```

### Interface Name
```
org.ronin.Observer.WindowTracker
```

## Signals

### WindowFocused

Emitted when the focused window changes.

**Signature:** `WindowFocused(ss)`

| Parameter | Type | Description |
|-----------|------|-------------|
| `title` | String (s) | The window title |
| `app_id` | String (s) | The application identifier (e.g., "firefox", "code") |

**Example signal:**
```
signal sender=:1.123 -> dest=(broadcast)
serial=456 path=/org/ronin/Observer
interface=org.ronin.Observer.WindowTracker
member=WindowFocused
   string "README.md - Visual Studio Code"
   string "code"
```

## Introspection XML

```xml
<!DOCTYPE node PUBLIC "-//freedesktop//DTD D-BUS Object Introspection 1.0//EN"
  "http://www.freedesktop.org/standards/dbus/1.0/introspect.dtd">
<node name="/org/ronin/Observer">
  <interface name="org.ronin.Observer.WindowTracker">
    <signal name="WindowFocused">
      <arg name="title" type="s" direction="out"/>
      <arg name="app_id" type="s" direction="out"/>
    </signal>
  </interface>
</node>
```

## Implementation Notes

### For Extension Developers

1. **Emit signals on focus change**: The extension should emit `WindowFocused` whenever `global.display.focus-window` changes.

2. **Debouncing**: The Ronin daemon handles debouncing (500ms), so the extension should emit events immediately.

3. **Error handling**: If the extension cannot determine window title or app_id, use empty strings `""`.

4. **Activation**: The extension should register itself on the Session Bus when GNOME Shell starts.

### For Daemon Developers

1. **Signal subscription**: Use `zbus::proxy` with `#[zbus(signal)]` attribute.

2. **Reconnection**: Monitor `NameOwnerChanged` signals to detect extension restart.

3. **Fallback**: If extension is not available, send `extension_missing` event to main app.

## Testing

### Manual Testing with dbus-send

Emit a test signal:
```bash
dbus-send --session --type=signal \
  /org/ronin/Observer \
  org.ronin.Observer.WindowTracker.WindowFocused \
  string:"Test Window" \
  string:"test-app"
```

### Verify Extension is Running

```bash
dbus-send --session --print-reply \
  --dest=org.freedesktop.DBus \
  /org/freedesktop/DBus \
  org.freedesktop.DBus.NameHasOwner \
  string:"org.ronin.Observer"
```

## References

- [zbus Documentation](https://docs.rs/zbus/latest/zbus/)
- [GNOME Shell Extension Guide](https://gjs.guide/extensions/)
- [D-Bus Specification](https://dbus.freedesktop.org/doc/dbus-specification.html)
- [Story 6.2: Window Title Tracking (Wayland GNOME)](docs/sprint-artifacts/6-2-window-title-tracking-wayland-gnome.md)
