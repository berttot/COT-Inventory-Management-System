export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);

  const payload = {
    message: err.message || "Server error",
    error: err.message || "Server error",
  };

  if (process.env.NODE_ENV !== "production") {
    payload.stack = err.stack;
  }

  res.json(payload);
};

