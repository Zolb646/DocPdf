# Agent Instructions

## 1. Project Overview

This is a Next.js application that serves as the front-end for a PDF conversion service. The application allows users to convert public web pages and office documents into PDFs. The actual PDF generation is handled by a separate back-end service (Gotenberg), and this front-end communicates with it via a REST API.

## 2. Development Setup

- **Framework**: Next.js (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (utility-first)
- **Fonts**: Geist, Geist Mono, Manrope (from Next.js)
- **API**: Communicates with a back-end service (Gotenberg) at `http://localhost:3000`

## 3. Key Components

- `app/page.tsx`: The main landing page with the PDF conversion form.
- `app/components/pdf-converter.tsx`: The core component that handles the conversion form, file uploads, URL input, and API calls.
- `app/components/ui/button.tsx`: Custom button component.
- `app/components/ui/input.tsx`: Custom input component.
- `app/components/ui/label.tsx`: Custom label component.
- `app/components/ui/progress.tsx`: Custom progress bar component.
- `app/components/ui/toast.tsx`: Custom toast notification component.

## 4. API Integration

- **Base URL**: `http://localhost:3000`
- **Endpoints**:
  - `POST /convert/url`: Convert a URL to PDF.
  - `POST /convert/upload`: Convert uploaded files to PDF.
- **Request Format**:
  - URL conversion: `{
  "url": "https://example.com",
  "format": "A4",
  "orientation": "portrait",
  "header": "Header text",
  "footer": "Footer text"
}`
  - File upload: Multipart form data with `files` field.
- **Response Format**:
  - Success: `{
  "success": true,
  "filename": "document.pdf",
  "downloadUrl": "/api/download/...
}`
  - Error: `{
  "success": false,
  "error": "Error message"
}`

## 5. UI/UX Guidelines

- **Theme**: Dark mode with a clean, modern interface.
- **Color Palette**:
  - Background: `--page-bg` (dark gray)
  - Text: `--ink` (light gray)
  - Accents: `--primary` (blue), `--secondary` (purple)
- **Layout**:
  - Centered content with responsive grid.
  - Clear visual hierarchy with distinct sections.
- **Interactions**:
  - Drag-and-drop file uploads.
  - Real-time progress bar during conversion.
  - Toast notifications for success/error messages.
  - Loading states for all asynchronous operations.

## 6. Development Workflow

1. **Start the development server**: `npm run dev`
2. **Make changes** to the components or styles.
3. **Test** the application by converting URLs and uploading files.
4. **Verify** that the back-end service is running and accessible.
5. **Check** the browser console for any errors or warnings.

## 7. Important Notes

- This is a **front-end only** application. The actual PDF generation happens on the back-end.
- All API calls are made to `http://localhost:3000` by default.
- The application uses **stateless** processing - no data is stored on the server.
- Error handling is implemented with **toast notifications** and **console logging**.
- The application uses **TypeScript** for type safety.

## 8. Common Tasks

- **Add a new feature**: Create a new component or modify an existing one.
- **Fix a bug**: Identify the issue, make the necessary changes, and test thoroughly.
- **Update API integration**: Modify the API calls in `pdf-converter.tsx`.
- **Change styling**: Update the Tailwind CSS classes in the components.

## 9. Troubleshooting

- **API not responding**: Ensure the back-end service is running at `http://localhost:3000`.
- **File upload fails**: Check browser console for CORS errors or network issues.
- **UI not rendering**: Verify that the Next.js development server is running.
- **TypeScript errors**: Run `npm run build` to check for type errors.

## 10. Code Structure

```
app/
├── components/
│   ├── pdf-converter.tsx      # Main conversion component
│   ├── ui/                    # UI primitive components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── progress.tsx
│   │   └── toast.tsx
│   └── ...
├── page.tsx                   # Main landing page
├── globals.css                # Global styles
└── layout.tsx                 # Root layout
```

## 11. Testing

- **Unit tests**: Not currently implemented.
- **Integration tests**: Manual testing recommended.
- **E2E tests**: Not currently implemented.

## 12. Deployment

- This is a front-end application that can be deployed independently.
- The back-end service needs to be deployed separately.
- Ensure the `NEXT_PUBLIC_API_URL` environment variable is set correctly in production.

## 13. Performance Considerations

- **File uploads**: Large files should be handled efficiently by the back-end.
- **URL conversions**: Should be fast and responsive.
- **Loading states**: All asynchronous operations should show loading indicators.
- **Error handling**: Graceful error handling with user feedback.

## 14. Security

- **CORS**: The back-end should be configured to allow requests from this front-end.
- **Input validation**: The back-end should validate all input data.
- **File uploads**: The back-end should scan files for malicious content.
- **Rate limiting**: The back-end should implement rate limiting to prevent abuse.

## 15. Best Practices

- Follow the Next.js and React best practices.
- Use TypeScript for type safety.
- Keep components small and focused.
- Use descriptive variable and function names.
- Add comments for complex logic.
- Test thoroughly before deploying changes.

## 16. Additional Information

- For more information about the back-end service, refer to the back-end documentation.
- The back-end service is built with Node.js and uses Gotenberg for PDF generation.
- The back-end service is deployed separately from the front-end.

## 17. Contact

For questions or issues, please refer to the back-end documentation or contact the development team.
