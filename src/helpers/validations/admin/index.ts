import Joi from "joi";

const ROLES = ["ADMIN", "SUB_ADMIN", "DISTRIBUTOR", "INSTALLER", "CUSTOMER"];

export const adminCreateUserValidation = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required(),
  password: Joi.string().min(6).required(),
  fullName: Joi.string().min(1).required(),
  phoneNumber: Joi.string().min(1).required(),
  role: Joi.string().valid(...ROLES).default("INSTALLER"),
});

export const adminUpdateUserValidation = Joi.object({
  fullName: Joi.string().min(1),
  phoneNumber: Joi.string().min(1),
  role: Joi.string().valid(...ROLES),
  isActive: Joi.boolean(),
}).min(1);
