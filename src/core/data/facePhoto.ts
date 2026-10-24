/** 직접 잘라 저장한 작은 JPEG만 허용한다. 백업에 외부 주소가 있어도 요청하지 않는다. */
export const isFacePhoto = (value: unknown): value is string => typeof value === 'string' && value.length <= 300_000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(value);
