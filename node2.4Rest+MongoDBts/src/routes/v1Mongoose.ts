import express, { Router, Request, Response } from "express";
import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";
import { DB_PASSWORD, SESSION_PASSWORD } from "../config/secret.js";

import session, { SessionOptions } from "express-session";
import sessionFileStore from "session-file-store";
const FileStore = sessionFileStore(session);
const routes: Router = express.Router();

routes.use(
  session({
    secret: SESSION_PASSWORD,
    resave: true,
    saveUninitialized: false,
    store: new FileStore(),
    cookie: { maxAge: 3600000, secure: false, httpOnly: true },
  })
);

interface Task extends Document {
  id: number;
  name: string;
  text: string;
  checked: boolean;
  //   [key: string]: any;
}

interface TaskList {
  items: Task[];
}

const taskSchema: Schema = new mongoose.Schema({
  id: {
    type: Number,
    require: [true, "Task description is required"],
  },
  name: {
    type: String,
    require: [true, "Task description is required"],
  },
  text: {
    type: String,
    require: [true, "Task description is required"],
  },
  checked: {
    type: Boolean,
    default: false,
  },
});

interface User extends Document {
  name: string;
  password: string;
  [key: string]: any;
}

const userSchema: Schema = new mongoose.Schema({
  name: {
    type: String,
    require: [true, "Task description is required"],
  },
  password: {
    type: String,
    require: [true, "Task description is required"],
  },
});

const Task = mongoose.model("Task", taskSchema);
const User = mongoose.model("User", userSchema);
const URI: string = `mongodb+srv://sergaiskov:${DB_PASSWORD}@cluster0.yssjlla.mongodb.net/?retryWrites=true&w=majority`;

(async () => {
  try {
    await mongoose.connect(URI);
  } catch (err) {
    return console.log(err);
  }
})();

routes.get("/items", async (req: Request, res: Response): Promise<Response> => {
  const user: string | undefined = req.session.login;
  if (user) {
    try {
      const userTASKS: TaskList = {
        items: [],
      };
      userTASKS.items = await Task.find({ name: user });

      console.log(userTASKS);
      return res.json(userTASKS);
    } catch (error) {
      return res.status(500).json({ ok: false });
    }
  } else {
    return res.status(403).json({ error: "forbidden" });
  }
});

routes.post(
  "/items",
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const userName: string = req.session.login;
      const idMess: number = Date.now();

      await Task.create({
        id: idMess,
        name: userName,
        text: req.body.text,
      });
      return res.status(201).json({ id: idMess });
    } catch (error) {
      return res.status(500).json({ ok: false });
    }
  }
);

routes.put("/items", async (req: Request, res: Response): Promise<Response> => {
  try {
    const idMess: number = req.body.id;
    const { text, checked }: { text: string; checked: boolean } = req.body;
    await Task.findOneAndUpdate(
      { id: idMess },
      { text: req.body.text, checked: req.body.checked },
      { new: true }
    );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ ok: false });
  }
});

routes.delete(
  "/items",
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const idMess: number = req.body.id;
      await Task.deleteOne({ id: idMess });
      return res.json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false });
    }
  }
);

routes.post(
  "/login",
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { login, pass }: { login: string; pass: string } = req.body;
      const user = (await User.findOne({ name: login })) as User;
      if (bcrypt.compareSync(pass, user.password)) {
        req.session.login = user.name;
        return res.status(201).json({ ok: true });
      } else {
        return res.status(403).json({ ok: false, error: "not found" });
      }
    } catch (error) {
      return res.status(500).json({ ok: false });
    }
  }
);

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

routes.post(
  "/register",
  async (req: Request, res: Response): Promise<Response> => {
    try {
      const { login, pass }: { login: string; pass: string } = req.body;
      const candidate = await User.findOne({ name: login });

      if (candidate) {
        return res.status(403).json({ ok: false, error: "isExist" });
      }
      const hashPass: string = bcrypt.hashSync(pass, 7);
      await User.create({ name: login, password: hashPass });

      return res.status(201).json({ ok: true });
    } catch (error) {
      return res.status(500).json({ ok: false });
    }
  }
);

// прослушиваем прерывание работы программы (ctrl-c)
process.on("SIGINT", async () => {
  await mongoose.disconnect();
  console.log("Приложение завершило работу");
  process.exit();
});

export { routes as v1Mongoose };