import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { sendResponse } from "../utils/sendResponse.ts";
import {
  RegisterRequestBody,
  AuthRequestBody,
  UpdateStatusRequestBody,
  UserResponse,
} from "../types.ts";
import { UserStatus } from "@prisma/client";
import {
  EmailSchema,
  LoginSchema,
  RegisterSchema,
} from "../schemas/auth.schemas.ts";
import { sendEmail } from "../utils/nodeMailer.ts";
import { sendVerificationEmail } from "../utils/nodeMailer.ts";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

export const verification = async (req: Request, res: Response) => {
  return res.json({});
};

export const login = async (
  req: Request<{}, {}, RegisterRequestBody>,
  res: Response
): Promise<void> => {
  try {
    // Validar los datos del body usando Zod
    LoginSchema.parse(req.body); // Si falla, Zod lanzará un error

    const { email, password } = req.body;

    // Buscar al usuario en la base de datos
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      sendResponse(res, 404, "User not found");
      return;
    }

    // Comparar la contraseña ingresada con la almacenada
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      sendResponse(res, 401, "Invalid credentials");
      return;
    }

    // Actualizar el último acceso del usuario
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Generar el token JWT
    const token = jwt.sign(
      { userId: updatedUser.id },
      process.env.JWT_SECRET!,
      {
        expiresIn: "1h",
      }
    );

    // Preparar la respuesta del usuario con solo los campos necesarios
    const userResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      status: updatedUser.status,
      is_verified: updatedUser.is_verified,
      last_login: updatedUser.last_login,
    };

    // Enviar la respuesta exitosa con el token y la información del usuario
    res.status(200).json({
      message: "Login successful",
      data: { token, user: userResponse },
    });
  } catch (error) {
    console.error(error); // Loguea el error para poder revisarlo
    res.status(500).json({ message: "Error logging in", data: null });
  }
};

export const register = async (
  req: Request<{}, {}, RegisterRequestBody>,
  res: Response
) => {
  RegisterSchema.parse(req.body); // Si falla, Zod lanzará un error

  const { email, password, full_name, verification_code } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const verificationRecord = await prisma.verificationCode.findUnique({
      where: { email },
    });

    // Validar que el código exista, coincida y no haya expirado
    if (
      !verificationRecord ||
      verificationRecord.code !== verification_code ||
      verificationRecord.expiresAt < new Date()
    ) {
      sendResponse(res, 400, "Invalid or expired verification code");
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      sendResponse(res, 400, "Email is already in use");
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        full_name,
      },
    });

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      status: user.status,
      profile_picture: user.profile_picture,
      is_verified: user.is_verified,
      last_login: user.last_login,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    sendResponse(res, 201, "User created", userResponse);
  } catch (error) {
    sendResponse(res, 500, "Error creating user", error);
    console.log(error);
  }
};

export const updateStatus = async (
  req: Request<{}, {}, UpdateStatusRequestBody>,
  res: Response
) => {
  const { status } = req.body;

  if (!["online", "offline", "away", "busy"].includes(status)) {
    sendResponse(res, 400, "Invalid status");
  }

  try {
    const userId = (req as any).user.userId;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    const userResponse: UserResponse = {
      id: updatedUser.id,
      email: updatedUser.email,
      full_name: updatedUser.full_name,
      status: updatedUser.status,
      profile_picture: updatedUser.profile_picture,
      is_verified: updatedUser.is_verified,
      last_login: updatedUser.last_login,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    };

    sendResponse(res, 200, "Status updated", userResponse);
  } catch (error) {
    sendResponse(res, 500, "Error updating status", error);
  }
};

export const sendVerificationCode = async (
  req: Request<{}, {}, { email: string }>,
  res: Response
) => {
  EmailSchema.safeParse(req.body);

  const { email } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    sendResponse(res, 400, "Email is already in use");
    return;
  }

  // Generar un código de verificación
  const verificationCodee = Math.floor(1000 + Math.random() * 9000).toString();

  try {
    // Guardar el código y su vencimiento en UTC
    await prisma.verificationCode.upsert({
      where: { email },
      update: {
        code: verificationCodee,
        expiresAt: new Date(Date.now() + 1 * 60 * 1000),
      },
      create: {
        email,
        code: verificationCodee,
        expiresAt: new Date(Date.now() + 1 * 60 * 1000),
      },
    });

    // Enviar el código al usuario
    await sendVerificationEmail(email, verificationCodee);

    sendResponse(res, 200, "Verification code sent", null);
  } catch (error) {
    sendResponse(res, 500, "Error sending verification code", error);
  }
};
