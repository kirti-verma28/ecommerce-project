export const imgUrl = (path) =>
    !path
        ? ""
        : path.startsWith("http")
            ? path
            : `${import.meta.env.VITE_DJANGO_BASE_URL}${path}`;