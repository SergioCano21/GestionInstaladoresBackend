import { transporter } from '../config/mail';

const sendEmail = async (
  to: string,
  subject: string,
  pdfPath: string,
  fileName: string,
  clientName: string,
) => {
  const mailOptions = {
    from: `Área de Servicios Especiales <${process.env.SMTP_USER}>`,
    to: to,
    subject: subject,
    attachments: [
      {
        fileName: fileName,
        path: pdfPath,
      },
    ],
    html: `
        <p>Estimado ${clientName},</p>
        <br>
        <p>Adjuntamos su recibo con los datos de la instalación realizada.</p>
        <p>Gracias por su preferencia.</p>
        <br>
        <p>Atte,<br>Área de Servicios Especiales</p>
      `,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

export default sendEmail;
