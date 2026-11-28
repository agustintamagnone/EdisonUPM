package es.upm.edison.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.upm.edison.exception.ApiError;
import es.upm.edison.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.CompositeLogoutHandler;
import org.springframework.security.web.authentication.logout.CookieClearingLogoutHandler;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Checks the stored account state so existing sessions cannot bypass a subsequent block. */
final class BlockedUserFilter extends OncePerRequestFilter {
    private final UserRepository users;
    private final ObjectMapper mapper;
    private final CompositeLogoutHandler logout = new CompositeLogoutHandler(
            new SecurityContextLogoutHandler(), new CookieClearingLogoutHandler("JSESSIONID"));

    BlockedUserFilter(UserRepository users, ObjectMapper mapper) {
        this.users = users;
        this.mapper = mapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)
                && users.findCurrent(CurrentUser.id(authentication)).filter(user -> user.isBlocked()).isPresent()) {
            logout.logout(request, response, authentication);
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            mapper.writeValue(response.getOutputStream(), ApiError.of(401, "User account is blocked"));
            return;
        }
        chain.doFilter(request, response);
    }
}
