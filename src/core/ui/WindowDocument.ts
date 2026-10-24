import { createContext, useContext } from 'react';

/** 분리된 창에서도 하위 팝업을 같은 문서에 표시한다. */
export const WindowDocument = createContext<Document | null>(null);
export const useWindowDocument = () => useContext(WindowDocument) ?? document;
