import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  LogOut,
  Megaphone,
  Network,
  Plus,
  RefreshCw,
  Send,
  Shield,
  Trash2,
  UserRound,
  Users
} from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081/api";

const roleLabels = {
  admin: "Quản trị viên",
  student: "Học viên",
  instructor: "Giảng viên",
  organizer: "Ban tổ chức"
};

const levelLabels = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao"
};

const notificationTypeLabels = {
  system: "Hệ thống",
  course: "Khóa học",
  exam: "Bài thi"
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });

  if (response.status === 204) return null;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || `Yêu cầu thất bại: ${response.status}`);
  }

  return body;
}

function App() {
  const [session, setSession] = useState(() => {
    const saved = localStorage.getItem("vdt-session");
    return saved ? JSON.parse(saved) : null;
  });
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const currentUser = session?.user;
  const isAdmin = currentUser?.role === "admin";
  const unreadCount = notifications.filter((item) => !item.read).length;

  async function login(credentials) {
    setStatus("loading");
    setError("");
    try {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials)
      });
      localStorage.setItem("vdt-session", JSON.stringify(data));
      setSession(data);
      setStatus("ready");
    } catch (loginError) {
      setError(loginError.message);
      setStatus("error");
    }
  }

  function logout() {
    localStorage.removeItem("vdt-session");
    setSession(null);
    setUsers([]);
    setCourses([]);
    setNotifications([]);
    setNotificationOpen(false);
  }

  async function loadData() {
    if (!currentUser) return;
    setStatus("loading");
    setError("");
    try {
      const [userData, courseData, notificationData] = await Promise.all([
        isAdmin ? request("/users") : Promise.resolve([]),
        request("/courses"),
        request(isAdmin ? "/notifications" : `/notifications?userId=${currentUser._id}`)
      ]);
      setUsers(userData);
      setCourses(courseData);
      setNotifications(notificationData);
      setStatus("ready");
    } catch (loadError) {
      setError(loadError.message);
      setStatus("error");
    }
  }

  useEffect(() => {
    loadData();
  }, [currentUser?._id]);

  async function markNotificationRead(id) {
    if (isAdmin) return;
    try {
      await request(`/notifications/${id}/read`, { method: "PATCH" });
      await loadData();
    } catch (readError) {
      setError(readError.message);
    }
  }

  if (!session) {
    return <LoginScreen error={error} status={status} onLogin={login} />;
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Network size={28} />
          <div>
            <strong>VDT Learning</strong>
            <span>{isAdmin ? "Bảng quản trị" : "Cổng học viên"}</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Các khu vực">
          <a href="#overview">
            <Shield size={18} />
            Tổng quan
          </a>
          <a href="#courses">
            <BookOpen size={18} />
            Khóa học
          </a>
          {isAdmin && (
            <a href="#members">
              <Users size={18} />
              Thành viên
            </a>
          )}
          <a href={isAdmin ? "#notifications" : "#registered-courses"}>
            <Bell size={18} />
            {isAdmin ? "Thông báo" : "Đã đăng ký"}
          </a>
        </nav>

        <div className="profile-box">
          <strong>{currentUser.fullName}</strong>
          <span>{currentUser.email}</span>
          <span>{roleLabels[currentUser.role] || currentUser.role}</span>
          <button type="button" onClick={logout}>
            <LogOut size={16} />
            Đăng xuất
          </button>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>{isAdmin ? "Bảng điều khiển hệ thống" : "Đăng ký khóa học"}</h1>
            <p>
              {isAdmin
                ? "Quản lý thành viên, khóa học và thông báo trong hệ thống."
                : "Đăng ký khóa học và nhận thông báo cá nhân trong chuông thông báo."}
            </p>
          </div>
          <div className="top-actions">
            {!isAdmin && (
              <div className="notification-menu">
                <button
                  className="bell-indicator"
                  type="button"
                  onClick={() => setNotificationOpen((open) => !open)}
                  title="Thông báo"
                >
                  <Bell size={18} />
                  <span>{unreadCount}</span>
                </button>
                {notificationOpen && (
                  <NotificationPopup
                    notifications={notifications}
                    isAdmin={isAdmin}
                  />
                )}
              </div>
            )}
            <button className="icon-button" type="button" onClick={loadData} title="Làm mới dữ liệu">
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {error && <div className="alert">{error}</div>}

        <Overview
          courses={courses}
          notifications={notifications}
          users={users}
          isAdmin={isAdmin}
        />

        {isAdmin ? (
          <AdminDashboard
            users={users}
            courses={courses}
            notifications={notifications}
            status={status}
            onReload={loadData}
            onError={setError}
            onReadNotification={markNotificationRead}
          />
        ) : (
          <StudentPortal
            user={currentUser}
            courses={courses}
            notifications={notifications}
            status={status}
            onReload={loadData}
            onError={setError}
          />
        )}
      </section>
    </main>
  );
}

function LoginScreen({ error, status, onLogin }) {
  const [email, setEmail] = useState("admin@vdt.edu.vn");
  const [password, setPassword] = useState("admin123");

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand login-brand">
          <Network size={30} />
          <div>
            <strong>VDT Learning</strong>
            <span>Demo microservice</span>
          </div>
        </div>
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin({ email, password });
          }}
        >
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit" disabled={status === "loading"}>
            Đăng nhập
          </button>
        </form>
        {error && <div className="alert">{error}</div>}
        <div className="demo-accounts">
          <button type="button" onClick={() => {
            setEmail("admin@vdt.edu.vn");
            setPassword("admin123");
          }}>
            Quản trị viên
          </button>
          <button type="button" onClick={() => {
            setEmail("minhanh@vdt.edu.vn");
            setPassword("student123");
          }}>
            Học viên
          </button>
        </div>
      </section>
    </main>
  );
}

function Overview({ courses, notifications, users, isAdmin }) {
  const totalLessons = courses.reduce(
    (sum, course) => sum + (course.lessons?.length || 0),
    0
  );
  const enrollments = courses.reduce(
    (sum, course) => sum + (course.enrolledUserIds?.length || 0),
    0
  );

  return (
    <section id="overview" className="metrics-grid">
      <Metric icon={<UserRound />} label={isAdmin ? "Thành viên" : "Vai trò"} value={isAdmin ? users.length : "Học viên"} />
      <Metric icon={<BookOpen />} label="Khóa học" value={courses.length} />
      <Metric icon={<CheckCircle2 />} label={isAdmin ? "Lượt đăng ký" : "Bài học"} value={isAdmin ? enrollments : totalLessons} />
      <Metric icon={<Bell />} label="Thông báo" value={notifications.length} />
    </section>
  );
}

function AdminDashboard({ users, courses, notifications, status, onReload, onError }) {
  return (
    <>
      <MemberManager users={users} status={status} onReload={onReload} onError={onError} />
      <CourseManager courses={courses} status={status} onReload={onReload} onError={onError} />
      <NotificationManager
        users={users}
        notifications={notifications}
        status={status}
        onReload={onReload}
        onError={onError}
      />
    </>
  );
}

function MemberManager({ users, status, onReload, onError }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "student123",
    role: "student"
  });

  async function createUser(event) {
    event.preventDefault();
    try {
      await request("/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ fullName: "", email: "", password: "student123", role: "student" });
      await onReload();
    } catch (error) {
      onError(error.message);
    }
  }

  async function deleteUser(id) {
    try {
      await request(`/users/${id}`, { method: "DELETE" });
      await onReload();
    } catch (error) {
      onError(error.message);
    }
  }

  return (
    <section id="members" className="section-band">
      <div className="section-heading">
        <h2>Thành viên</h2>
        <span>{users.length} người dùng từ dịch vụ người dùng</span>
      </div>
      <form className="admin-form" onSubmit={createUser}>
        <input placeholder="Họ tên" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input placeholder="Mật khẩu" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
          <option value="student">Học viên</option>
          <option value="instructor">Giảng viên</option>
          <option value="organizer">Ban tổ chức</option>
          <option value="admin">Quản trị viên</option>
        </select>
        <button className="primary-button" type="submit" disabled={status === "loading"}>
          <Plus size={16} />
          Thêm
        </button>
      </form>
      <div className="table-list">
        {users.map((user) => (
          <article className="table-row" key={user._id}>
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
            </div>
            <span>{roleLabels[user.role] || user.role}</span>
            <button className="icon-button danger" type="button" onClick={() => deleteUser(user._id)} title="Xóa thành viên">
              <Trash2 size={16} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function CourseManager({ courses, status, onReload, onError }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "beginner"
  });

  async function createCourse(event) {
    event.preventDefault();
    try {
      await request("/courses", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          instructorId: "admin",
          lessons: [{ title: "Bài học 1", durationMinutes: 30 }]
        })
      });
      setForm({ title: "", description: "", level: "beginner" });
      await onReload();
    } catch (error) {
      onError(error.message);
    }
  }

  async function deleteCourse(id) {
    try {
      await request(`/courses/${id}`, { method: "DELETE" });
      await onReload();
    } catch (error) {
      onError(error.message);
    }
  }

  return (
    <section id="courses" className="section-band">
      <div className="section-heading">
        <h2>Khóa học</h2>
        <span>{courses.length} khóa học từ dịch vụ khóa học</span>
      </div>
      <form className="admin-form" onSubmit={createCourse}>
        <input placeholder="Tên khóa học" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <input placeholder="Mô tả" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        <select value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
          <option value="beginner">Cơ bản</option>
          <option value="intermediate">Trung cấp</option>
          <option value="advanced">Nâng cao</option>
        </select>
        <button className="primary-button" type="submit" disabled={status === "loading"}>
          <Plus size={16} />
          Thêm
        </button>
      </form>
      <div className="course-grid">
        {courses.map((course) => (
          <CourseCard
            key={course._id}
            course={course}
            action={
              <button className="icon-button danger" type="button" onClick={() => deleteCourse(course._id)} title="Xóa khóa học">
                <Trash2 size={16} />
              </button>
            }
          />
        ))}
      </div>
    </section>
  );
}

function NotificationManager({ users, notifications, status, onReload, onError }) {
  const students = users.filter((user) => user.role === "student");
  const [form, setForm] = useState({
    target: "all",
    title: "",
    message: "",
    type: "system"
  });

  async function sendNotification(event) {
    event.preventDefault();
    try {
      const body =
        form.target === "all"
          ? { userIds: students.map((student) => student._id), title: form.title, message: form.message, type: form.type }
          : { userId: form.target, title: form.title, message: form.message, type: form.type };
      await request("/notifications", { method: "POST", body: JSON.stringify(body) });
      setForm({ target: "all", title: "", message: "", type: "system" });
      await onReload();
    } catch (error) {
      onError(error.message);
    }
  }

  async function deleteNotification(id) {
    try {
      await request(`/notifications/${id}`, { method: "DELETE" });
      await onReload();
    } catch (error) {
      onError(error.message);
    }
  }

  return (
    <section id="notifications" className="section-band">
      <div className="section-heading">
        <h2>Thông báo</h2>
        <span>{notifications.length} bản ghi từ dịch vụ thông báo</span>
      </div>
      <form className="admin-form notification-form" onSubmit={sendNotification}>
        <select value={form.target} onChange={(event) => setForm({ ...form, target: event.target.value })}>
          <option value="all">Tất cả học viên</option>
          {students.map((student) => (
            <option key={student._id} value={student._id}>{student.fullName}</option>
          ))}
        </select>
        <input placeholder="Tiêu đề" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        <input placeholder="Nội dung" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
          <option value="system">Hệ thống</option>
          <option value="course">Khóa học</option>
          <option value="exam">Bài thi</option>
        </select>
        <button className="primary-button" type="submit" disabled={status === "loading"}>
          <Send size={16} />
          Gửi
        </button>
      </form>
      <NotificationList notifications={notifications} onDelete={deleteNotification} />
    </section>
  );
}

function StudentPortal({
  user,
  courses,
  notifications,
  status,
  onReload,
  onError,
  onReadNotification
}) {
  const enrolledCourseIds = useMemo(
    () =>
      new Set(
        courses
          .filter((course) => course.enrolledUserIds?.includes(user._id))
          .map((course) => course._id)
      ),
    [courses, user._id]
  );

  async function enroll(courseId) {
    try {
      await request("/enrollments", {
        method: "POST",
        body: JSON.stringify({ courseId, userId: user._id })
      });
      await onReload();
    } catch (error) {
      onError(error.message);
    }
  }

  async function completeCourse(courseId) {
    try {
      await request("/enrollments/complete", {
        method: "POST",
        body: JSON.stringify({ courseId, userId: user._id })
      });
      await onReload();
    } catch (error) {
      onError(error.message);
    }
  }

  const enrolledCourses = courses.filter((course) =>
    course.enrolledUserIds?.includes(user._id)
  );

  return (
    <>
      <section id="courses" className="section-band">
        <div className="section-heading">
          <h2>Khóa học hiện có</h2>
          <span>{courses.length} khóa học từ dịch vụ khóa học</span>
        </div>
        <div className="course-grid">
          {courses.map((course) => {
            const enrolled = enrolledCourseIds.has(course._id);
            return (
              <CourseCard
                key={course._id}
                course={course}
                action={
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => enroll(course._id)}
                    disabled={enrolled || status === "loading"}
                  >
                    {enrolled ? "Đã đăng ký" : "Đăng ký"}
                  </button>
                }
              />
            );
          })}
        </div>
      </section>

      <section id="registered-courses" className="section-band">
        <div className="section-heading">
          <h2>Khóa học đã đăng ký</h2>
          <span>{enrolledCourses.length} khóa học của bạn</span>
        </div>
        {enrolledCourses.length === 0 ? (
          <div className="empty-state">
            <BookOpen size={22} />
            <span>Bạn chưa đăng ký khóa học nào</span>
          </div>
        ) : (
          <div className="course-grid">
            {enrolledCourses.map((course) => (
              <CourseCard
                key={course._id}
                course={course}
                action={
                  course.completedUserIds?.includes(user._id) ? (
                    <span className="registered-badge completed">Đã học xong</span>
                  ) : (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => completeCourse(course._id)}
                      disabled={status === "loading"}
                    >
                      Học xong
                    </button>
                  )
                }
              />
            ))}
          </div>
        )}
        <div className="registered-notifications">
          <div className="section-heading compact-heading">
            <h3>Thông báo cần đọc</h3>
            <span>{notifications.filter((notification) => !notification.read).length} chưa đọc</span>
          </div>
          <NotificationList notifications={notifications} onRead={onReadNotification} />
        </div>
      </section>
    </>
  );
}

function CourseCard({ course, action }) {
  return (
    <article className="course-card">
      <div>
        <div className="level">{levelLabels[course.level] || course.level}</div>
        <h3>{course.title}</h3>
        <p>{course.description}</p>
      </div>
      <ul>
        {course.lessons?.map((lesson) => (
          <li key={lesson.title}>
            {lesson.title}
            <span>{lesson.durationMinutes} phút</span>
          </li>
        ))}
      </ul>
      <div className="card-actions">
        <span>{course.enrolledUserIds?.length || 0} lượt đăng ký</span>
        {action}
      </div>
    </article>
  );
}

function NotificationList({ notifications, onDelete, onRead }) {
  if (notifications.length === 0) {
    return (
      <div className="empty-state">
        <Megaphone size={22} />
        <span>Chưa có thông báo</span>
      </div>
    );
  }

  return (
    <div className="notification-list">
      {notifications.map((notification) => (
        <article className={`notification-item ${notification.read ? "" : "unread"}`} key={notification._id}>
          <Bell size={18} />
          <div>
            <strong>{notification.title}</strong>
            <p>{notification.message}</p>
            <small>Người nhận: {notification.userId}</small>
          </div>
          <span>{notificationTypeLabels[notification.type] || notification.type}</span>
          {onRead && !notification.read && (
            <button className="secondary-button" type="button" onClick={() => onRead(notification._id)}>
              Đã đọc
            </button>
          )}
          {onDelete && (
            <button className="icon-button danger" type="button" onClick={() => onDelete(notification._id)} title="Xóa thông báo">
              <Trash2 size={16} />
            </button>
          )}
        </article>
      ))}
    </div>
  );
}

function NotificationPopup({ notifications, isAdmin }) {
  const latestNotifications = notifications.slice(0, 6);

  return (
    <aside className="notification-popup" aria-label="Popup thông báo">
      <div className="popup-heading">
        <strong>{isAdmin ? "Thông báo hệ thống" : "Thông báo của tôi"}</strong>
        <span>{notifications.filter((item) => !item.read).length} chưa đọc</span>
      </div>
      {latestNotifications.length === 0 ? (
        <div className="popup-empty">
          <Megaphone size={18} />
          <span>Chưa có thông báo</span>
        </div>
      ) : (
        <div className="popup-list">
          {latestNotifications.map((notification) => (
            <article
              className={`popup-item ${notification.read ? "" : "unread"}`}
              key={notification._id}
            >
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
              </div>
              <span>{notificationTypeLabels[notification.type] || notification.type}</span>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
