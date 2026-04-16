
import { RefObject } from 'react';
import { ExcelLikeNavigationOptions, useExcelLikeNavigation } from './useExcelLikeNavigation';

export const useEnterNavigation = (
    containerRef: RefObject<HTMLElement>,
    options: ExcelLikeNavigationOptions = {},
) => {
    useExcelLikeNavigation(containerRef, {
        captureTab: false,
        includeTextareas: false,
        ...options,
    });
};
