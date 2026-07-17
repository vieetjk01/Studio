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

/// Lấy đuôi file (chữ thường), rỗng nếu không có.
fn ext_lower(path: &str) -> String {
    Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
}

/// Đuôi file mà app được phép GHI — chỉ tài liệu/dữ liệu, KHÔNG thực thi.
/// Nếu webview bị lợi dụng (XSS vượt CSP), đây là chốt chặn cuối để kẻ tấn công
/// không thể ghi .exe/.bat/.ps1… (vd thả vào thư mục Startup) chiếm quyền máy.
const WRITABLE_EXTS: &[&str] = &["docx", "xlsx", "json", "html", "htm", "txt", "csv", "pdf", "mstmp"];
/// Đuôi file mà app được phép ĐỌC (chỉ manifest/cache dữ liệu do app tạo) — chặn
/// đọc file lạ để lộ token/bí mật của app khác.
const READABLE_EXTS: &[&str] = &["json", "txt", "csv"];
/// Đuôi file mà app được phép MỞ bằng ứng dụng mặc định (không mở file thực thi).
const OPENABLE_EXTS: &[&str] = &["pdf", "html", "htm", "docx", "xlsx", "txt", "csv", "png", "jpg", "jpeg"];

/// Ghi file AN TOÀN: tạo thư mục cha, ghi ra .tmp rồi đổi tên — không hỏng file
/// khi mất điện giữa chừng. Nội dung nhận dạng base64 (dùng cho mọi loại file).
#[tauri::command]
fn write_file_b64(path: String, contents_b64: String) -> Result<(), String> {
    if has_control_chars(&path) || !WRITABLE_EXTS.contains(&ext_lower(&path).as_str()) {
        return Err("ext_not_allowed".to_string());
    }
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
    // Chỉ đọc file dữ liệu app tạo (manifest/cache JSON…), không đọc file lạ.
    if has_control_chars(&path) || !READABLE_EXTS.contains(&ext_lower(&path).as_str()) {
        return Err("bad_path".to_string());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn delete_file(path: String) -> Result<(), String> {
    if has_control_chars(&path) {
        return Err("bad_path".to_string());
    }
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
    // Chỉ nhận nguồn HTML và đích PDF hợp lệ (tránh bị dùng để ghi file lạ).
    if has_control_chars(&html_path) || has_control_chars(&pdf_path) {
        return Err("bad_path".to_string());
    }
    let src_ext = ext_lower(&html_path);
    if src_ext != "html" && src_ext != "htm" {
        return Err("bad_source".to_string());
    }
    if ext_lower(&pdf_path) != "pdf" {
        return Err("bad_target".to_string());
    }
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
    if has_control_chars(&from) || has_control_chars(&to) {
        return Err("bad_path".to_string());
    }
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
    // Chỉ cho phép tải bản cài từ đúng repo phát hành chính thức. Nếu không,
    // lệnh này trở thành công cụ chạy .exe tùy ý (RCE) khi JS bị lợi dụng.
    // PHẢI parse URL trước rồi mới so host/path — kiểm tra chuỗi thô có thể bị
    // qua mặt bằng "../" (vd https://github.com/vieetjk01/../attacker/... sẽ
    // chuẩn hoá thành host github.com nhưng path /attacker/...).
    let parsed = reqwest::Url::parse(&url).map_err(|_| "url không hợp lệ".to_string())?;
    if parsed.scheme() != "https"
        || parsed.host_str() != Some("github.com")
        || !parsed.path().starts_with("/vieetjk01/")
    {
        return Err("nguồn cập nhật không hợp lệ".to_string());
    }
    let client = reqwest::Client::builder()
        // Asset GitHub 302 sang objects.githubusercontent.com → phải theo redirect.
        .redirect(reqwest::redirect::Policy::limited(10))
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
    // File cài thật luôn > 1MB — nhỏ hơn nghĩa là tải hụt / trang lỗi.
    if bytes.len() < 1_000_000 {
        return Err(format!("tải lỗi (file quá nhỏ: {} bytes)", bytes.len()));
    }
    let mut path = std::env::temp_dir();
    path.push("MStudo-Desktop-setup.exe");
    std::fs::write(&path, &bytes).map_err(|e| e.to_string())?;
    std::process::Command::new(&path)
        .spawn()
        .map_err(|e| e.to_string())?;
    // Cho trình cài đặt khởi động rồi thoát app (giải phóng file để ghi đè).
    std::thread::sleep(Duration::from_millis(1200));
    app.exit(0);
    Ok(())
}

/// Chặn ký tự điều khiển / xuống dòng trong tham số mở ngoài (phòng thủ chiều sâu).
fn has_control_chars(s: &str) -> bool {
    s.chars().any(|c| c.is_control())
}

/// Mở liên kết trong trình duyệt mặc định (nút "Tải bản cập nhật").
///
/// Dùng `explorer` (không qua `cmd`): Rust truyền tham số thẳng cho CreateProcess
/// nên KHÔNG có shell để chèn lệnh — trước đây `cmd /C start` cho phép chèn lệnh
/// qua ký tự `&`, `|`, `>`… nếu URL bị thao túng (command injection).
#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("bad_url".to_string());
    }
    if has_control_chars(&url) {
        return Err("bad_url".to_string());
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&url)
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
/// Dùng `explorer` trực tiếp — không qua `cmd` (xem ghi chú ở `open_url`).
/// Chỉ mở tài liệu/ảnh; không cho mở file thực thi (chống lạm dụng để chạy .exe).
#[tauri::command]
fn open_file(path: String) -> Result<(), String> {
    if has_control_chars(&path) || !OPENABLE_EXTS.contains(&ext_lower(&path).as_str()) {
        return Err("bad_path".to_string());
    }
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

/// Mở thư mục trong Windows Explorer.
#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    // explorer <arg> sẽ CHẠY file nếu path trỏ tới .exe/UNC — chỉ cho mở THƯ MỤC.
    if has_control_chars(&path) || !Path::new(&path).is_dir() {
        return Err("bad_path".to_string());
    }
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

/// Tạo cây thư mục (create_dir_all) cho một hợp đồng trên máy.
#[tauri::command]
fn create_dir(path: String) -> Result<(), String> {
    if has_control_chars(&path) {
        return Err("bad_path".to_string());
    }
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

#[derive(Serialize)]
struct DirEntryInfo {
    name: String,
    is_dir: bool,
    size: u64,
    mtime_ms: u64,
}

/// Liệt kê nội dung một thư mục (không đệ quy) — dùng để quét file cần tải lên
/// Drive (kèm size + thời điểm sửa để bỏ qua file đã tải, không đổi).
#[tauri::command]
fn list_dir(path: String) -> Result<Vec<DirEntryInfo>, String> {
    let mut out = Vec::new();
    let rd = match fs::read_dir(&path) {
        Ok(r) => r,
        Err(_) => return Ok(out), // thư mục chưa tồn tại → rỗng
    };
    for entry in rd.flatten() {
        let md = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let mtime_ms = md
            .modified()
            .ok()
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        out.push(DirEntryInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            is_dir: md.is_dir(),
            size: if md.is_file() { md.len() } else { 0 },
            mtime_ms,
        });
    }
    Ok(out)
}

#[derive(Serialize)]
struct UploadResult {
    id: String,
}

async fn parse_upload_final(resp: reqwest::Response) -> Result<UploadResult, String> {
    let status = resp.status().as_u16();
    let txt = resp.text().await.map_err(|e| e.to_string())?;
    if status != 200 && status != 201 {
        return Err(format!("final {status}"));
    }
    let v: serde_json::Value = serde_json::from_str(&txt).map_err(|e| e.to_string())?;
    let id = v.get("id").and_then(|x| x.as_str()).unwrap_or("").to_string();
    if id.is_empty() {
        return Err("no_id".to_string());
    }
    Ok(UploadResult { id })
}

/// Tải MỘT file lên Google Drive bằng resumable upload theo khối 8MB — file lớn
/// (video) KHÔNG bị nạp trọn vào RAM. `access_token` do máy chủ mstudo cấp
/// (scope drive.file); `folder_id` là thư mục đích trên Drive của studio.
#[tauri::command]
async fn drive_upload(
    access_token: String,
    folder_id: String,
    file_path: String,
    name: String,
    mime: String,
) -> Result<UploadResult, String> {
    use std::io::{Read, Seek, SeekFrom};
    if has_control_chars(&file_path) || has_control_chars(&folder_id) {
        return Err("bad_path".to_string());
    }
    let meta = fs::metadata(&file_path).map_err(|e| e.to_string())?;
    let total: u64 = meta.len();
    let mime = if mime.is_empty() {
        "application/octet-stream".to_string()
    } else {
        mime
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(1800))
        .build()
        .map_err(|e| e.to_string())?;

    // 1) Khởi tạo phiên resumable — gửi metadata, nhận URL tải lên ở header Location.
    let body = serde_json::json!({ "name": name, "parents": [folder_id] });
    let init = client
        .post("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id")
        .header("Authorization", format!("Bearer {access_token}"))
        .header("Content-Type", "application/json; charset=UTF-8")
        .header("X-Upload-Content-Type", &mime)
        .header("X-Upload-Content-Length", total.to_string())
        .body(serde_json::to_string(&body).map_err(|e| e.to_string())?)
        .send()
        .await
        .map_err(|e| e.to_string())?;
    if !init.status().is_success() {
        return Err(format!("init {}", init.status().as_u16()));
    }
    let upload_url = init
        .headers()
        .get("location")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| "no_upload_url".to_string())?;

    // File rỗng → PUT một lần thân rỗng.
    if total == 0 {
        let resp = client
            .put(&upload_url)
            .header("Content-Length", "0")
            .body(Vec::<u8>::new())
            .send()
            .await
            .map_err(|e| e.to_string())?;
        return parse_upload_final(resp).await;
    }

    let mut f = fs::File::open(&file_path).map_err(|e| e.to_string())?;
    const CHUNK: u64 = 8 * 1024 * 1024; // bội số 256KB theo yêu cầu của Google
    let mut offset: u64 = 0;

    loop {
        let end = std::cmp::min(offset + CHUNK, total);
        let len = (end - offset) as usize;
        let mut buf = vec![0u8; len];
        f.seek(SeekFrom::Start(offset)).map_err(|e| e.to_string())?;
        f.read_exact(&mut buf).map_err(|e| e.to_string())?;
        let range = format!("bytes {}-{}/{}", offset, end - 1, total);
        let resp = client
            .put(&upload_url)
            .header("Content-Length", len.to_string())
            .header("Content-Range", range)
            .body(buf)
            .send()
            .await
            .map_err(|e| e.to_string())?;
        let status = resp.status().as_u16();
        if status == 200 || status == 201 {
            return parse_upload_final(resp).await;
        } else if status == 308 {
            offset = end; // Google đã nhận khối này → gửi khối kế
            if offset >= total {
                return Err("incomplete".to_string());
            }
        } else {
            let t = resp.text().await.unwrap_or_default();
            return Err(format!("upload {status} {}", t.chars().take(200).collect::<String>()));
        }
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
            download_and_run,
            create_dir,
            list_dir,
            drive_upload
        ])
        .run(tauri::generate_context!())
        .expect("Không khởi động được MStudo Desktop");
}
