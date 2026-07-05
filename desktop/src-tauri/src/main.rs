// MStudo Desktop — client Windows: tự lưu hợp đồng + sao lưu dữ liệu studio.
// Frontend (ui/) gọi các lệnh dưới đây qua window.__TAURI__.core.invoke.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::Engine as _;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime};

#[derive(Serialize)]
struct HttpResp {
    status: u16,
    body_b64: String,
}

/// Gọi API mstudo từ phía Rust (tránh CORS của webview). Trả body dạng base64
/// để dùng được cho cả JSON lẫn file nhị phân (docx, xlsx).
#[tauri::command]
async fn http_get(url: String, token: Option<String>) -> Result<HttpResp, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| e.to_string())?;
    let mut req = client.get(&url).header("User-Agent", "MStudoDesktop/0.1");
    if let Some(t) = token.filter(|t| !t.is_empty()) {
        req = req.header("Authorization", format!("Bearer {t}"));
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    Ok(HttpResp {
        status,
        body_b64: base64::engine::general_purpose::STANDARD.encode(&bytes),
    })
}

#[tauri::command]
async fn http_post(url: String, token: Option<String>, body_json: String) -> Result<HttpResp, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;
    let mut req = client
        .post(&url)
        .header("User-Agent", "MStudoDesktop/0.1")
        .header("Content-Type", "application/json")
        .body(body_json);
    if let Some(t) = token.filter(|t| !t.is_empty()) {
        req = req.header("Authorization", format!("Bearer {t}"));
    }
    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    Ok(HttpResp {
        status,
        body_b64: base64::engine::general_purpose::STANDARD.encode(&bytes),
    })
}

/// Hộp thoại chọn thư mục lưu dữ liệu.
#[tauri::command]
fn pick_folder() -> Option<String> {
    rfd::FileDialog::new()
        .set_title("Chọn thư mục lưu dữ liệu MStudo")
        .pick_folder()
        .map(|p| p.to_string_lossy().to_string())
}

/// Ghi file AN TOÀN: tạo thư mục cha, ghi ra .tmp rồi đổi tên — không hỏng file
/// khi mất điện giữa chừng. Nội dung nhận dạng base64 (dùng cho mọi loại file).
#[tauri::command]
fn write_file_b64(path: String, contents_b64: String) -> Result<(), String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(contents_b64.as_bytes())
        .map_err(|e| e.to_string())?;
    let target = PathBuf::from(&path);
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let tmp = target.with_extension(format!(
        "{}.mstmp",
        target.extension().and_then(|e| e.to_str()).unwrap_or("bin")
    ));
    fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;
    // Windows: rename không đè file có sẵn → xóa trước (bản mới thay bản cũ cùng tên).
    let _ = fs::remove_file(&target);
    fs::rename(&tmp, &target).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn read_text(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    fs::remove_file(&path).map_err(|e| e.to_string())
}

/// Xóa các FILE trong thư mục cũ hơn `days` ngày (không đụng thư mục con —
/// thư mục hợp đồng không bao giờ tự xóa).
#[tauri::command]
fn cleanup_old(dir: String, days: u64) -> Result<u32, String> {
    let cutoff = SystemTime::now() - Duration::from_secs(days * 24 * 3600);
    let mut removed = 0u32;
    let entries = match fs::read_dir(&dir) {
        Ok(e) => e,
        Err(_) => return Ok(0), // thư mục chưa tồn tại → không có gì để dọn
    };
    for entry in entries.flatten() {
        let p = entry.path();
        if !p.is_file() {
            continue;
        }
        if let Ok(meta) = entry.metadata() {
            if let Ok(modified) = meta.modified() {
                if modified < cutoff && fs::remove_file(&p).is_ok() {
                    removed += 1;
                }
            }
        }
    }
    Ok(removed)
}

/// Chuyển HTML hợp đồng thành PDF bằng Microsoft Edge headless (có sẵn trên
/// Windows 10/11). Trả lỗi nếu không tìm thấy Edge — frontend sẽ giữ bản HTML.
#[tauri::command]
fn edge_pdf(html_path: String, pdf_path: String) -> Result<(), String> {
    let candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ];
    let edge = candidates
        .iter()
        .find(|p| Path::new(p).exists())
        .ok_or_else(|| "edge_not_found".to_string())?;
    if let Some(parent) = Path::new(&pdf_path).parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let url = format!("file:///{}", html_path.replace('\\', "/"));
    let status = std::process::Command::new(edge)
        .args([
            "--headless=new",
            "--disable-gpu",
            "--no-first-run",
            "--no-pdf-header-footer",
            &format!("--print-to-pdf={pdf_path}"),
            &url,
        ])
        .status()
        .map_err(|e| e.to_string())?;
    if !status.success() || !Path::new(&pdf_path).exists() {
        return Err("edge_failed".to_string());
    }
    Ok(())
}

fn copy_dir_recursive(from: &Path, to: &Path) -> std::io::Result<()> {
    fs::create_dir_all(to)?;
    for entry in fs::read_dir(from)? {
        let entry = entry?;
        let src = entry.path();
        let dst = to.join(entry.file_name());
        if src.is_dir() {
            copy_dir_recursive(&src, &dst)?;
        } else {
            fs::copy(&src, &dst)?;
        }
    }
    Ok(())
}

/// Di chuyển toàn bộ dữ liệu đã lưu sang thư mục mới (khi studio đổi vị trí lưu).
#[tauri::command]
fn move_dir(from: String, to: String) -> Result<(), String> {
    let from_p = PathBuf::from(&from);
    let to_p = PathBuf::from(&to);
    if !from_p.exists() {
        return Ok(());
    }
    // Thử rename nhanh (cùng ổ đĩa); khác ổ thì copy + xóa.
    if fs::rename(&from_p, &to_p).is_ok() {
        return Ok(());
    }
    copy_dir_recursive(&from_p, &to_p).map_err(|e| e.to_string())?;
    fs::remove_dir_all(&from_p).map_err(|e| e.to_string())?;
    Ok(())
}

/// Tên máy (đặt tên thiết bị khi đăng ký).
#[tauri::command]
fn hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "May tinh Windows".to_string())
}

/// Mở TOÀN BỘ ứng dụng quản lý studio (web app hiện tại) trong một cửa sổ riêng
/// của client — đăng nhập & dùng đầy đủ chức năng; engine sao lưu vẫn chạy ở
/// cửa sổ chính. Gọi lại thì đưa cửa sổ đã mở lên trước.
#[tauri::command]
async fn open_app(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri::Manager;
    if let Some(w) = app.get_webview_window("studioapp") {
        let _ = w.set_focus();
        return Ok(());
    }
    let parsed = tauri::Url::parse(&url).map_err(|e| e.to_string())?;
    tauri::WebviewWindowBuilder::new(&app, "studioapp", tauri::WebviewUrl::External(parsed))
        .title("MStudo — Quản lý studio")
        .inner_size(1360.0, 900.0)
        .maximized(true)
        .focused(true)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Tự cập nhật: tải trình cài đặt (.exe) về thư mục tạm rồi chạy, và thoát app
/// để trình cài đặt ghi đè. Không cần khóa ký — dùng chính bản phát hành hiện có.
#[tauri::command]
async fn download_and_run(app: tauri::AppHandle, url: String) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(600))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get(&url)
        .header("User-Agent", "MStudoDesktop/updater")
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("tải lỗi HTTP {}", resp.status().as_u16()));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    let mut path = std::env::temp_dir();
    path.push("MStudo-Desktop-setup.exe");
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    std::process::Command::new(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    // Cho trình cài đặt khởi động rồi thoát app (giải phóng file để ghi đè).
    std::thread::sleep(Duration::from_millis(600));
    app.exit(0);
    Ok(())
}

/// Mở liên kết trong trình duyệt mặc định (nút "Tải bản cập nhật").
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("bad_url".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[allow(unreachable_code)]
    {
        let _ = url;
        Err("unsupported".to_string())
    }
}

/// Mở một file bằng ứng dụng mặc định (PDF/HTML để in hợp đồng).
#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[allow(unreachable_code)]
    {
        let _ = path;
        Err("unsupported".to_string())
    }
}

/// Mở thư mục trong Windows Explorer.
#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    #[allow(unreachable_code)]
    {
        let _ = path;
        Err("unsupported".to_string())
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            http_get,
            http_post,
            pick_folder,
            write_file_b64,
            read_text,
            path_exists,
            delete_file,
            cleanup_old,
            edge_pdf,
            move_dir,
            hostname,
            open_folder,
            open_file,
            open_url,
            open_app,
            download_and_run
        ])
        .run(tauri::generate_context!())
        .expect("Không khởi động được MStudo Desktop");
}
