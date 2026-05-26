import { Request, Response, NextFunction, RequestHandler } from "express";

const asyncHandler = (
  controller: (req: Request, res: Response, next: NextFunction) => Promise<any>
): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(controller(req, res, next)).catch(next);
  };
};

export default asyncHandler;
