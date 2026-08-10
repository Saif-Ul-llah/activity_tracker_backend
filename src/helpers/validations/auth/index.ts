import Joi from "joi";

// Login Validation schema
export const loginValidation = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } }) // disables top-level domain validation to allow any domain
    .required()
    .messages({
      "string.email": "Invalid email address",
      "any.required": "Email is required",
    }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),
});

// Register Validation schema
export const registerValidation = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Invalid email address",
      "any.required": "Email is required",
    }),

  password: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),

  fullName: Joi.string().min(1).required().messages({
    "string.base": "Full name must be a string",
    "string.empty": "Full name must be a string and not empty",
    "any.required": "Full name is required",
  }),

  phoneNumber: Joi.string().min(1).required().messages({
    "string.base": "Phone number must be a string",
    "string.empty": "Phone number must be a string and not empty",
    "any.required": "Phone number is required",
  }),

  role: Joi.string()
    .valid("ADMIN", "SUB_ADMIN", "DISTRIBUTOR", "INSTALLER", "CUSTOMER")
    .default("CUSTOMER")
    .messages({
      "any.only":
        "Role must be one of: ADMIN, SUB_ADMIN, DISTRIBUTOR, INSTALLER, CUSTOMER",
      "any.required": "Role is required",
    }),
});

// reset password validation schema
export const resetPasswordValidation = Joi.object({
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "Password must be at least 6 characters long",
    "any.required": "Password is required",
  }),

  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Invalid email address",
      "any.required": "Email is required",
    }),

  
});
