import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from '@react-email/components';

interface VerificationEmailProps {
  userName: string;
  verificationUrl: string;
  expirationTime?: string;
}

const VerificationEmail = ({
  userName,
  verificationUrl,
  expirationTime,
}: VerificationEmailProps
) => {

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Verifica tu cuenta de Pagefall - Solo te tomará un clic</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans py-[40px] px-[16px]">
          <Container className="bg-white rounded-[8px] shadow-sm max-w-[580px] mx-auto px-[40px] py-[40px]">
            {/* Header */}
            <Section className="text-center mb-[32px]">
              <Heading className="text-[28px] font-bold text-gray-900 m-0 mb-[8px]">
                Pagefall
              </Heading>
              <Text className="text-[16px] text-gray-600 m-0">
                Plataforma de creación web
              </Text>
            </Section>

            {/* Main Content */}
            <Section className="mb-[32px]">
              <Heading className="text-[24px] font-bold text-gray-900 mb-[16px] mt-0">
                ¡Hola {userName}!
              </Heading>

              <Text className="text-[16px] text-gray-700 leading-[24px] mb-[16px] mt-0">
                Gracias por registrarte en Pagefall. Para completar tu registro y comenzar a crear páginas web increíbles, necesitamos verificar tu dirección de correo electrónico.
              </Text>

              <Text className="text-[16px] text-gray-700 leading-[24px] mb-[24px] mt-0">
                Haz clic en el botón de abajo para verificar tu cuenta:
              </Text>
            </Section>

            {/* CTA Button */}
            <Section className="text-center mb-[32px]">
              <Button
                href={verificationUrl}
                className="bg-blue-600 text-white px-[32px] py-[16px] rounded-[8px] text-[16px] font-semibold no-underline box-border inline-block"
              >
                Verificar mi cuenta
              </Button>
            </Section>

            {/* Alternative Link */}
            <Section className="mb-[32px]">
              <Text className="text-[14px] text-gray-600 leading-[20px] mb-[8px] mt-0">
                Si el botón no funciona, copia y pega este enlace en tu navegador:
              </Text>
              <Link
                href={verificationUrl}
                className="text-blue-600 text-[14px] break-all"
              >
                {verificationUrl}
              </Link>
            </Section>

            {/* Expiration Notice */}
            {expirationTime && (
              <Section className="mb-[32px]">
                <Text className="text-[14px] text-gray-600 leading-[20px] mt-0 mb-0">
                  <strong>Importante:</strong> Este enlace expirará en {expirationTime}. Si necesitas un nuevo enlace de verificación, puedes solicitarlo desde la página de inicio de sesión.
                </Text>
              </Section>
            )}

            {/* Security Notice */}
            <Section className="bg-gray-50 rounded-[8px] px-[20px] py-[16px] mb-[32px]">
              <Text className="text-[14px] text-gray-600 leading-[20px] mt-0 mb-0">
                <strong>¿No creaste esta cuenta?</strong> Si no te registraste en Pagefall, puedes ignorar este mensaje de forma segura. Tu dirección de correo no será utilizada sin tu consentimiento.
              </Text>
            </Section>

            {/* Closing */}
            <Section className="mb-[32px]">
              <Text className="text-[16px] text-gray-700 leading-[24px] mb-[8px] mt-0">
                ¡Estamos emocionados de tenerte en Pagefall!
              </Text>
              <Text className="text-[16px] text-gray-700 leading-[24px] mt-0 mb-0">
                Saludos cordiales,<br />
                El equipo de Pagefall
              </Text>
            </Section>

            {/* Footer */}
            <Section className="border-t border-gray-200 pt-[24px]">
              <Text className="text-[12px] text-gray-500 leading-[16px] text-center m-0 mb-[8px]">
                Pagefall - Crea páginas web sin límites
              </Text>
              <Text className="text-[12px] text-gray-500 leading-[16px] text-center m-0 mb-[8px]">
                Calle Innovación 123, 28001 Madrid, España
              </Text>
              <Text className="text-[12px] text-gray-500 leading-[16px] text-center m-0">
                © {new Date().getFullYear()} Pagefall. Todos los derechos reservados.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default VerificationEmail;