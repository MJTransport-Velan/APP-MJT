import { Response } from 'express';
import { excelExportService } from '../services/excel-export.service';
import { asyncHandler } from '../utils/asyncHandler';

export const excelExportController = {
  export: asyncHandler(async (req, res: Response) => {
    const { buffer, fileName } = await excelExportService.build(req.body);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    return res.send(buffer);
  }),
};
