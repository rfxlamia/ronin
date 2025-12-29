/// Observer daemon backends
///
/// These modules implement the platform-specific window tracking logic
/// and are used by the ronin-observer binary.
///
/// Story 6.1: X11 Window Title Tracking
/// Story 6.2: Wayland/GNOME Window Title Tracking
pub mod observer_wayland;
pub mod observer_x11;
