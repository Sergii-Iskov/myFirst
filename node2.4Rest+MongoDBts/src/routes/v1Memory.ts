import express, { Router, Request, Response } from "express";
import session from "express-session";
import sessionFileStore from "session-file-store";
import { SESSION_PASSWORD } from "../config/secret.js";

const FileStore = sessionFileStore(session);
const routes: Router = express.Router();

interface Task {
  id: number;
  name: string;
  text: string;
  checked: boolean;
}

interface TaskList {
  items: Task[];
}

interface User {
  name: string;
  pass: string;
}
interface UserList {
  users: User[];
}

const TASKS: TaskList = {
  items: [],
};

const Users: UserList = {
  users: [],
};

routes.use(
  session({
    secret: SESSION_PASSWORD,
    resave: true,
    saveUninitialized: false,
    store: new FileStore(),
    cookie: { maxAge: 3600000, secure: false, httpOnly: true },
  })
);

routes.get("/items", (req: Request, res: Response) => {
  const user: string | undefined = req.session.login;
  if (user) {
    const userTASKS: TaskList = {
      items: [],
    };
    userTASKS.items = TASKS.items.filter((task) => task.name === user);
    return res.json(userTASKS);
  } else {
    return res.status(403).json({ error: "forbidden" });
  }
});

routes.post("/items", (req: Request, res: Response) => {
  try {
    const userName: string = req.session.login;
    const idMess: number = Date.now();
    const newText: string = req.body.text;

    const newItem: Task = {
      id: idMess,
      name: userName,
      text: newText,
      checked: false,
    };
    TASKS.items.push(newItem);
    return res.status(201).json({ id: idMess });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
});

routes.put("/items", (req: Request, res: Response) => {
  try {
    const idMess: number = req.body.id;
    // let changeItem = TASKS.items.find((item) => item.id === idMess);
    let changeItem: Task | undefined = TASKS.items.find(
      (item) => item.id === idMess
    );
    if (changeItem) {
      changeItem.text = req.body.text;
      changeItem.checked = req.body.checked;
      return res.status(204).json({ ok: true });
    } else {
      return res.status(404).json({ ok: false });
    }
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
});

routes.delete("/items", (req: Request, res: Response) => {
  try {
    const idMess: number = req.body.id;
    TASKS.items = TASKS.items.filter((item) => item.id !== idMess);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
});

routes.post("/login", (req: Request, res: Response) => {
  try {
    const { login, pass }: { login: string; pass: string } = req.body;
    const curUser: User | undefined = Users.users.find(
      (user) => user.name === login && user.pass === pass
    );

    if (curUser) {
      req.session.login = curUser.name;
      return res.status(201).json({ ok: true });
    } else {
      return res.status(403).json({ ok: false, error: "not found" });
    }
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
});

routes.post("/logout", (req: Request, res: Response) => {
  if (!req.body) return res.sendStatus(500);
  req.session.destroy((err) => {
    if (err) {
      return res.status(403).json({ error: `${err.message}` });
    } else {
      res.clearCookie("connect.sid");
      return res.status(201).json({ ok: true });
    }
  });
});

routes.post("/register", (req: Request, res: Response) => {
  if (!req.body) return res.sendStatus(500);
  const { login, pass }: { login: string; pass: string } = req.body;
  const isExist: boolean = Users.users.find((user) => user.name === login)
    ? true
    : false;

  if (isExist) {
    return res.status(403).json({ ok: false, error: "isExist" });
  } else {
    Users.users.push({ name: login, pass });
    return res.status(201).json({ ok: true });
  }
});

export { routes as v1Memory };
