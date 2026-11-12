package es.upm.edison.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.upm.edison.exception.ApiError;
import es.upm.edison.model.UserRole;
import es.upm.edison.repository.UserRepository;
import es.upm.edison.service.UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import java.util.List;
import java.util.UUID;
import java.nio.charset.StandardCharsets;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationProvider authenticationProvider(UserRepository users, PasswordEncoder encoder) {
        // Perform a BCrypt check even for unknown emails.
        String dummyHash = encoder.encode("unused-dummy-password");
        return new AuthenticationProvider() {
            @Override
            public Authentication authenticate(Authentication authentication) {
                String email = authentication.getName().trim();
                String password = authentication.getCredentials().toString();
                // BCrypt only supports passwords up to 72 bytes.
                if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
                    throw new BadCredentialsException("Invalid credentials or access option");
                }
                var user = users.findByEmailIgnoreCase(email).orElse(null);
                String hash = user == null || user.getPasswordHash() == null ? dummyHash : user.getPasswordHash();
                boolean validPassword = encoder.matches(password, hash);
                boolean validOption = user != null && (
                        ("UPM_ACCOUNT".equals(authentication.getDetails()) && user.getRole() != UserRole.INVESTOR)
                        || ("EXTERNAL_USER".equals(authentication.getDetails()) && user.getRole() == UserRole.INVESTOR));
                if (!validPassword || !validOption) {
                    throw new BadCredentialsException("Invalid credentials or access option");
                }
                return UsernamePasswordAuthenticationToken.authenticated(user.getId().toString(), null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
            }

            @Override
            public boolean supports(Class<?> authentication) {
                return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
            }
        };
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper mapper, UserService users)
            throws Exception {
        http.cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/csrf", "/api/auth/login", "/error").permitAll()
                        .requestMatchers("/api/users/me", "/api/users/me/**", "/api/ideas/mine").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/**").permitAll()
                        .anyRequest().authenticated())
                .formLogin(form -> form
                        .loginProcessingUrl("/api/auth/login")
                        .usernameParameter("email")
                        .authenticationDetailsSource(request -> request.getParameter("accountType"))
                        .successHandler((request, response, authentication) -> {
                            response.setContentType("application/json");
                            mapper.writeValue(response.getOutputStream(),
                                    users.getMe(UUID.fromString(authentication.getName())));
                        })
                        .failureHandler((request, response, exception) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            mapper.writeValue(response.getOutputStream(),
                                    ApiError.of(401, "Invalid credentials or access option"));
                        }))
                .logout(logout -> logout.logoutUrl("/api/auth/logout")
                        .deleteCookies("JSESSIONID")
                        .logoutSuccessHandler((request, response, authentication) -> response.setStatus(204)))
                .requestCache(cache -> cache.disable())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            mapper.writeValue(response.getOutputStream(), ApiError.of(401, "Authentication required"));
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            mapper.writeValue(response.getOutputStream(), ApiError.of(403, "Access denied or invalid CSRF token"));
                        }));
        // Keep Spring Security's default session persistence, fixation protection and CSRF.
        return http.build();
    }
}
