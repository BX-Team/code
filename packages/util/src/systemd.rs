use std::ffi::OsStr;
use std::io;
use std::os::linux::net::SocketAddrExt;
use std::os::unix::ffi::OsStrExt;
use std::os::unix::net::{SocketAddr, UnixDatagram};
use std::path::Path;

/// Reports that startup finished, so `Type=notify` units activate only once the service is usable.
pub fn notify_ready() {
    let Some(address) = std::env::var_os("NOTIFY_SOCKET") else {
        return;
    };

    if let Err(error) = send(&address, b"READY=1\n") {
        tracing::warn!(%error, "cannot report readiness to systemd");
    }
}

fn send(address: &OsStr, message: &[u8]) -> io::Result<()> {
    let socket = UnixDatagram::unbound()?;

    // A leading '@' names a socket in the abstract namespace, where the rest is not a filesystem
    // path and must not be resolved as one.
    match address.as_bytes().strip_prefix(b"@") {
        Some(name) => socket.send_to_addr(message, &SocketAddr::from_abstract_name(name)?)?,
        None => socket.send_to(message, Path::new(address))?,
    };

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    struct Listener {
        socket: UnixDatagram,
        directory: std::path::PathBuf,
    }

    impl Listener {
        fn bind(name: &str) -> Self {
            let directory = std::env::temp_dir().join(format!("bx-notify-{name}"));
            let _ = std::fs::remove_dir_all(&directory);
            std::fs::create_dir_all(&directory).unwrap();

            Self {
                socket: UnixDatagram::bind(directory.join("notify")).unwrap(),
                directory,
            }
        }

        fn path(&self) -> std::path::PathBuf {
            self.directory.join("notify")
        }

        fn receive(&self) -> Vec<u8> {
            let mut buffer = [0u8; 64];
            let read = self.socket.recv(&mut buffer).unwrap();
            buffer[..read].to_vec()
        }
    }

    impl Drop for Listener {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.directory);
        }
    }

    #[test]
    fn sends_the_ready_datagram_to_a_path_socket() {
        let listener = Listener::bind("path");

        send(listener.path().as_os_str(), b"READY=1\n").unwrap();

        assert_eq!(listener.receive(), b"READY=1\n");
    }

    #[test]
    fn sends_the_ready_datagram_to_an_abstract_socket() {
        let name = format!("bx-notify-abstract-{}", std::process::id());
        let address = SocketAddr::from_abstract_name(&name).unwrap();
        let listener = UnixDatagram::bind_addr(&address).unwrap();

        send(OsStr::new(&format!("@{name}")), b"READY=1\n").unwrap();

        let mut buffer = [0u8; 64];
        let read = listener.recv(&mut buffer).unwrap();
        assert_eq!(&buffer[..read], b"READY=1\n");
    }

    #[test]
    fn reports_an_error_when_nothing_is_listening() {
        let listener = Listener::bind("missing");
        let path = listener.path();
        drop(listener);

        assert!(send(path.as_os_str(), b"READY=1\n").is_err());
    }
}
